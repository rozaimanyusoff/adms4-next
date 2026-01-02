"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CustomDataGrid, ColumnDef } from "@/components/ui/DataGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MultiSelect, type ComboboxOption } from "@/components/ui/combobox";
import { Switch } from "@/components/ui/switch";
import { Plus, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { authenticatedApi } from "@/config/api";
import { toast } from "sonner";

type AssessmentInfo = {
  asset_id?: number;
  register_number?: string;
  assessment_year?: number;
  id?: number;
};

type PcAsset = {
  id?: number;
  age?: number | null;
  brand?: { id?: number; name?: string } | string | null;
  category?: { id?: number; name?: string } | string | null;
  classification?: string | null;
  condition_status?: string | null;
  costcenter?: { id?: number; name?: string } | string | null;
  department?: { id?: number; name?: string; code?: string } | string | null;
  disposed_date?: string | null;
  entry_code?: string | null;
  fuel_type?: string | null;
  location?: { id?: number; name?: string; code?: string } | string | null;
  model?: { id?: number; name?: string } | string | null;
  nbv?: string | number | null;
  owner?: { id?: number; full_name?: string; name?: string; ramco_id?: string } | string | null;
  purchase_date?: string | null;
  purchase_id?: number | null;
  purchase_year?: number | null;
  purpose?: string | null;
  record_status?: string | null;
  register_number?: string | null;
  transmission?: string | null;
  type?: { id?: number; name?: string } | string | null;
  unit_price?: string | number | null;
};

type PcAssessmentRow = PcAsset & {
  assessed?: boolean;
  assessment_count?: number;
  assessments?: AssessmentInfo[];
  last_assessment?: AssessmentInfo | null;
  action?: string;
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleDateString();
};

const formatMoney = (value?: string | number | null) => {
  if (value === null || value === undefined || value === "") return "-";
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isNaN(num)) {
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return String(value);
};

const displayName = (value: any) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return value?.name || value?.full_name || value?.code || value?.label || "-";
};

const uniqueOptions = (values: Array<string | number | null | undefined>) =>
  Array.from(new Set(values.filter((v): v is string | number => v !== undefined && v !== null && v !== "")));

const PcAssessmentRecord: React.FC = () => {
  const router = useRouter();
  const [data, setData] = useState<PcAssessmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string[]>([]);
  const [selectedCostcenter, setSelectedCostcenter] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string[]>([]);
  const [selectedAssessmentYears, setSelectedAssessmentYears] = useState<string[]>([]);
  const [onlyDeviceCategories, setOnlyDeviceCategories] = useState(true);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await authenticatedApi.get("/api/compliance/it-assets-status");
      const list = Array.isArray(res?.data?.data)
        ? res.data.data
        : Array.isArray(res?.data)
          ? res.data
          : [];

      const normalized = list.map((item: any) => {
        const asset: PcAsset = item?.asset ?? {};
        return {
          ...asset,
          assessed: item?.assessed ?? false,
          assessment_count: item?.assessment_count ?? 0,
          assessments: item?.assessments,
          last_assessment: item?.last_assessment,
        };
      });

      setData(normalized as PcAssessmentRow[]);
    } catch (error) {
      console.error("Failed to load computer assets", error);
      toast.error("Failed to load computer assets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const summarize = useCallback(
    (getter: (row: PcAssessmentRow) => string) => {
      const map = new Map<string, number>();
      data.forEach((row) => {
        const label = getter(row) || "-";
        map.set(label, (map.get(label) ?? 0) + 1);
      });
      return Array.from(map.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    },
    [data]
  );

  const categorySummary = useMemo(
    () => summarize((row) => displayName(row.category)),
    [summarize]
  );
  const costcenterSummary = useMemo(
    () => summarize((row) => displayName(row.costcenter)),
    [summarize]
  );
  const locationSummary = useMemo(
    () => summarize((row) => displayName(row.location)),
    [summarize]
  );
  const lastAssessmentSummary = useMemo(
    () =>
      summarize((row) => {
        const year = row.last_assessment?.assessment_year;
        return year ? String(year) : "Not Assessed";
      }),
    [summarize]
  );

  const summaryToOptions = useCallback(
    (items: { label: string; count: number }[]): ComboboxOption[] =>
      items.map((item) => ({
        value: item.label,
        label: item.label,
        render: (
          <div className="flex w-full items-center justify-between">
            <span className="truncate">{item.label}</span>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {item.count}
            </Badge>
          </div>
        ),
      })),
    []
  );

  const deviceCategorySet = useMemo(() => new Set(["laptop", "desktop", "tablet"]), []);
  const categoryOptions = useMemo(
    () =>
      summaryToOptions(
        categorySummary.filter(
          (item) => !onlyDeviceCategories || deviceCategorySet.has(item.label.toLowerCase())
        )
      ),
    [categorySummary, summaryToOptions, onlyDeviceCategories, deviceCategorySet]
  );
  const costcenterOptions = useMemo(
    () => summaryToOptions(costcenterSummary),
    [costcenterSummary, summaryToOptions]
  );
  const locationOptions = useMemo(() => summaryToOptions(locationSummary), [locationSummary, summaryToOptions]);

  const filteredData = useMemo(
    () =>
      data.filter((row) => {
        const categoryLabel = displayName(row.category);
        const costcenterLabel = displayName(row.costcenter);
        const locationLabel = displayName(row.location);
        const assessmentLabel = row.last_assessment?.assessment_year
          ? String(row.last_assessment.assessment_year)
          : "Not Assessed";
        const isDeviceCategory = ["laptop", "desktop", "tablet"].includes(
          categoryLabel?.toString().toLowerCase()
        );

        const categoryMatch =
          selectedCategory.length === 0 || selectedCategory.includes(categoryLabel);
        const costcenterMatch =
          selectedCostcenter.length === 0 || selectedCostcenter.includes(costcenterLabel);
        const locationMatch =
          selectedLocation.length === 0 || selectedLocation.includes(locationLabel);
        const assessmentMatch =
          selectedAssessmentYears.length === 0 || selectedAssessmentYears.includes(assessmentLabel);
        const deviceGate = !onlyDeviceCategories || isDeviceCategory;
        return categoryMatch && costcenterMatch && locationMatch && assessmentMatch && deviceGate;
      }),
    [
      data,
      selectedCategory,
      selectedCostcenter,
      selectedLocation,
      selectedAssessmentYears,
      onlyDeviceCategories,
    ]
  );

  const handleCreate = useCallback(() => {
    router.push("/compliance/pc-assessment-form");
  }, [router]);

  const handleOpenRow = useCallback(
    (row: PcAssessmentRow) => {
      if (!row?.id) return;
      router.push(`/compliance/pc-assessment-form?id=${row.id}`);
    },
    [router]
  );

  const columns: ColumnDef<PcAssessmentRow>[] = useMemo(() => {
    const typeOptions = uniqueOptions(data.map((d) => (typeof d.type === "string" ? d.type : d.type?.name)));
    const categoryFilterOptions = uniqueOptions(
      data.map((d) => (typeof d.category === "string" ? d.category : d.category?.name))
    );
    const conditionOptions = uniqueOptions(data.map((d) => d.condition_status || ""));
    const recordStatusOptions = uniqueOptions(data.map((d) => d.record_status || ""));
    const costCenterOptions = uniqueOptions(
      data.map((d) => (typeof d.costcenter === "string" ? d.costcenter : d.costcenter?.name))
    );
    const deptOptions = uniqueOptions(
      data.map((d) => (typeof d.department === "string" ? d.department : d.department?.name || d.department?.code))
    );
    const locationFilterOptions = uniqueOptions(
      data.map((d) => (typeof d.location === "string" ? d.location : d.location?.name || d.location?.code))
    );
    const fuelOptions = uniqueOptions(data.map((d) => d.fuel_type || ""));
    const transmissionOptions = uniqueOptions(data.map((d) => d.transmission || ""));
    const purchaseYearOptions = uniqueOptions(data.map((d) => d.purchase_year ?? null));

    return [
      { key: "id", header: "ID", sortable: true },
      { key: "register_number", header: "Register #", sortable: true, filter: "input" },
      { key: "entry_code", header: "Entry Code", sortable: true, filter: "input" },
      {
        key: "type",
        header: "Type",
        filter: "singleSelect",
        filterParams: { options: typeOptions },
        render: (row) => displayName(row.type),
      },
      {
        key: "category",
        header: "Category",
        filter: "singleSelect",
        filterParams: { options: categoryFilterOptions },
        render: (row) => displayName(row.category),
      },
      {
        key: "classification",
        header: "Classification",
        filter: "singleSelect",
        filterParams: { options: uniqueOptions(data.map((d) => d.classification || "")) },
        render: (row) => row.classification || "-",
      },
      { key: "brand", header: "Brand", filter: "input", render: (row) => displayName(row.brand) },
      { key: "model", header: "Model", filter: "input", render: (row) => displayName(row.model) },
      {
        key: "condition_status",
        header: "Condition",
        filter: "singleSelect",
        filterParams: { options: conditionOptions },
        render: (row) =>
          row.condition_status ? (
            <Badge variant={row.condition_status === "in-use" ? "secondary" : "outline"}>
              {row.condition_status}
            </Badge>
          ) : (
            "-"
          ),
      },
      {
        key: "record_status",
        header: "Record Status",
        filter: "singleSelect",
        filterParams: { options: recordStatusOptions },
        render: (row) =>
          row.record_status ? (
            <Badge variant={row.record_status === "active" ? "secondary" : "destructive"}>
              {row.record_status}
            </Badge>
          ) : (
            "-"
          ),
      },
      {
        key: "assessed",
        header: "Assessed",
        render: (row) =>
          typeof row.assessed === "boolean" ? (
            <Badge variant={row.assessed ? "secondary" : "outline"}>
              {row.assessed ? "Yes" : "No"}
            </Badge>
          ) : (
            "-"
          ),
      },
      {
        key: "assessment_count",
        header: "Assessment Count",
        sortable: true,
        render: (row) => row.assessment_count ?? 0,
      },
      {
        key: "last_assessment",
        header: "Last Assessment",
        render: (row) => row.last_assessment?.assessment_year ?? "-",
      },
      { key: "age", header: "Age", sortable: true },
      {
        key: "purchase_date",
        header: "Purchase Date",
        sortable: true,
        filter: "date",
        render: (row) => formatDate(row.purchase_date),
      },
      {
        key: "purchase_year",
        header: "Purchase Year",
        sortable: true,
        filter: "singleSelect",
        filterParams: { options: purchaseYearOptions },
      },
      { key: "purchase_id", header: "Purchase ID", sortable: true },
      {
        key: "unit_price",
        header: "Unit Price",
        sortable: true,
        render: (row) => formatMoney(row.unit_price),
      },
      { key: "nbv", header: "NBV", sortable: true, render: (row) => formatMoney(row.nbv) },
      {
        key: "costcenter",
        header: "Cost Center",
        filter: "singleSelect",
        filterParams: { options: costCenterOptions },
        render: (row) => displayName(row.costcenter),
      },
      {
        key: "location",
        header: "Location",
        filter: "singleSelect",
        filterParams: { options: locationFilterOptions },
        render: (row) => displayName(row.location),
      },
      {
        key: "department",
        header: "Department",
        filter: "singleSelect",
        filterParams: { options: deptOptions },
        render: (row) => displayName(row.department),
      },
      { key: "owner", header: "Owner", filter: "input", render: (row) => displayName(row.owner) },
      { key: "purpose", header: "Purpose", filter: "input", render: (row) => row.purpose || "-" },
      {
        key: "disposed_date",
        header: "Disposed Date",
        filter: "date",
        render: (row) => formatDate(row.disposed_date),
      },
      {
        key: "action",
        header: "Action",
        render: (row) => (
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-800"
            onClick={() => handleOpenRow(row)}
          >
            <Eye className="h-4 w-4 mr-1" />
            Assess
          </Button>
        ),
      },
    ];
  }, [data, handleOpenRow]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Compliance / IT Hardware
          </p>
          <h1 className="text-xl font-semibold">PC Assessment Record</h1>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-4 md:items-end">
        <div className="space-y-1 md:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">By Category</p>
          <MultiSelect
            options={categoryOptions}
            value={selectedCategory}
            onValueChange={setSelectedCategory}
            placeholder="Select category..."
            searchPlaceholder="Search category..."
            clearable
          />
        </div>
        <div className="space-y-1 md:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">By Cost Center</p>
          <MultiSelect
            options={costcenterOptions}
            value={selectedCostcenter}
            onValueChange={setSelectedCostcenter}
            placeholder="Select cost center..."
            searchPlaceholder="Search cost center..."
            clearable
          />
        </div>
        <div className="space-y-1 md:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">By Location</p>
          <MultiSelect
            options={locationOptions}
            value={selectedLocation}
            onValueChange={setSelectedLocation}
            placeholder="Select location..."
            searchPlaceholder="Search location..."
            clearable
          />
        </div>
        <div className="flex flex-col gap-1 md:items-end md:justify-end">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category Filter</p>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">Only Laptop/Desktop/Tablet</div>
            <Switch checked={onlyDeviceCategories} onCheckedChange={setOnlyDeviceCategories} />
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Last Assessment</p>
        <div className="flex flex-wrap items-center gap-2">
          {lastAssessmentSummary.map((item) => {
            const active = selectedAssessmentYears.includes(item.label);
            return (
              <Card
                key={item.label}
                role="button"
                tabIndex={0}
                onClick={() =>
                  setSelectedAssessmentYears((prev) =>
                    prev.includes(item.label)
                      ? prev.filter((yr) => yr !== item.label)
                      : [...prev, item.label]
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") e.currentTarget.click();
                }}
                className={`cursor-pointer transition-colors ${
                  active
                    ? "border-blue-300 bg-blue-50/70"
                    : "border-fuchsia-200 bg-fuchsia-50/50 hover:border-fuchsia-300"
                }`}
              >
                <CardContent className="flex items-center gap-2 px-3 py-2">
                  <span className="truncate font-medium">{item.label}</span>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    {item.count}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
          <div className="flex items-stretch ml-auto">
            <Button onClick={handleCreate} className="gap-2 w-full sm:w-auto" disabled={loading}>
              <Plus className="h-4 w-4" />
              {loading ? "Loading..." : "Create"}
            </Button>
          </div>
          {lastAssessmentSummary.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="px-3 py-2 text-sm text-muted-foreground">No assessment data</CardContent>
            </Card>
          )}
        </div>
      </div>
      <CustomDataGrid
        data={filteredData}
        columns={columns}
        pageSize={10}
        pagination={false}
        inputFilter={false}
        dataExport={false}
        onRowDoubleClick={handleOpenRow}
        rowClass={(row) =>
          row.assessed
            ? "bg-green-200/50"
            : "even:bg-gray-50 dark:even:bg-slate-700 dark:odd:bg-slate-800"
        }
      />
    </div>
  );
};

export default PcAssessmentRecord;
