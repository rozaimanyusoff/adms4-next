"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CustomDataGrid, ColumnDef } from "@/components/ui/DataGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Plus, Eye, Send } from "lucide-react";
import ExcelItAssessReportButton from "@/components/compliance/excel-itassess-report";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { useRouter } from "next/navigation";
import { authenticatedApi } from "@/config/api";
import { toast } from "sonner";

type AssessmentInfo = {
  asset_id?: number;
  register_number?: string;
  assessment_year?: number;
  id?: number;
  asset_status?: string | null;
  brand?: PcAsset["brand"];
  category?: PcAsset["category"];
  classification?: PcAsset["classification"];
  costcenter?: PcAsset["costcenter"];
  department?: PcAsset["department"];
  location?: PcAsset["location"];
  model?: PcAsset["model"];
  owner?: PcAsset["owner"];
  purchase_date?: PcAsset["purchase_date"];
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
  asset_status?: string | null;
  action?: string;
};

type ClassificationPopoverSummary = {
  label: string;
  assessed: number;
  notAssessed: number;
  total: number;
  categories: Array<{
    label: string;
    assessed: number;
    notAssessed: number;
    total: number;
  }>;
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

const normalizeClassificationLabel = (value: any) => {
  const raw = displayName(value);
  const lower = raw.toString().toLowerCase();
  if (raw === "-" || raw.trim() === "") return "Unclassified";
  if (["asset", "assets"].includes(lower)) return "Asset";
  if (["non-asset", "non asset", "nonasset"].includes(lower)) return "Non-Asset";
  return raw;
};

const uniqueOptions = (values: Array<string | number | null | undefined>) =>
  Array.from(new Set(values.filter((v): v is string | number => v !== undefined && v !== null && v !== "")));

const PcAssessmentRecord: React.FC = () => {
  const router = useRouter();
  const [data, setData] = useState<PcAssessmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hideDisposed, setHideDisposed] = useState(true);
  const [resendingId, setResendingId] = useState<number | null>(null);
  const [hiddenLocationCategories, setHiddenLocationCategories] = useState<string[]>([]);
  const [classificationPopoverOpen, setClassificationPopoverOpen] = useState(false);
  const [classificationPopoverSummary, setClassificationPopoverSummary] = useState<ClassificationPopoverSummary | null>(null);
  const [classificationPopoverPosition, setClassificationPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const classificationContainerRef = useRef<HTMLDivElement | null>(null);

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
        const lastAssessment: AssessmentInfo | null = item?.last_assessment ?? null;
        const fallbackAssessment =
          lastAssessment ??
          (Array.isArray(item?.assessments) && item.assessments.length > 0
            ? item.assessments[item.assessments.length - 1]
            : null);
        const assessmentAsset = fallbackAssessment ?? {};
        const mergedAsset: PcAsset = {
          ...asset,
          register_number: asset.register_number ?? assessmentAsset.register_number ?? null,
          purchase_date: asset.purchase_date ?? assessmentAsset.purchase_date ?? null,
          costcenter: asset.costcenter ?? assessmentAsset.costcenter ?? null,
          department: asset.department ?? assessmentAsset.department ?? null,
          location: asset.location ?? assessmentAsset.location ?? null,
          brand: asset.brand ?? assessmentAsset.brand ?? null,
          model: asset.model ?? assessmentAsset.model ?? null,
          category: asset.category ?? assessmentAsset.category ?? null,
          classification: asset.classification ?? assessmentAsset.classification ?? null,
          owner: asset.owner ?? assessmentAsset.owner ?? null,
        };
        return {
          ...mergedAsset,
          assessed: item?.assessed ?? false,
          assessment_count: item?.assessment_count ?? 0,
          assessments: item?.assessments,
          last_assessment: lastAssessment,
          asset_status: lastAssessment?.asset_status ?? fallbackAssessment?.asset_status ?? null,
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

  const assessedByLocationCategory = useMemo(() => {
    const map = new Map<string, Record<string, { assessed: number; total: number }>>();
    const categorySet = new Set<string>();

    data.forEach((row) => {
      const location = displayName(row.location);
      const category = displayName(row.category);
      categorySet.add(category);
      const current = map.get(location) ?? {};
      const entry = current[category] ?? { assessed: 0, total: 0 };
      entry.total += 1;
      if (row.assessed) entry.assessed += 1;
      current[category] = entry;
      map.set(location, current);
    });

    const categories = Array.from(categorySet).sort((a, b) => a.localeCompare(b));
    const rows = Array.from(map.entries())
      .map(([location, counts]) => {
        const row: Record<string, any> = { location, total: 0 };
        categories.forEach((category) => {
          const entry = counts[category] ?? { assessed: 0, total: 0 };
          row[`${category}__assessed`] = entry.assessed;
          row[`${category}__unassessed`] = entry.total - entry.assessed;
          row[`${category}__total`] = entry.total;
          row.total += entry.total;
        });
        return row;
      })
      .sort((a, b) => b.total - a.total || String(a.location).localeCompare(String(b.location)));

    return { categories, rows };
  }, [data]);

  const categoryColors = [
    "#2563eb",
    "#22c55e",
    "#f97316",
    "#0ea5e9",
    "#a855f7",
    "#f43f5e",
    "#84cc16",
    "#eab308",
  ];
  const lightenColor = (hex: string, amount = 0.55) => {
    const normalized = hex.replace("#", "");
    if (normalized.length !== 6) return hex;
    const num = parseInt(normalized, 16);
    const mix = (value: number) => Math.round(value + (255 - value) * amount);
    const r = mix((num >> 16) & 0xff);
    const g = mix((num >> 8) & 0xff);
    const b = mix(num & 0xff);
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  };
  const hiddenLocationCategorySet = useMemo(
    () => new Set(hiddenLocationCategories),
    [hiddenLocationCategories]
  );
  const visibleLocationCategories = useMemo(
    () => assessedByLocationCategory.categories.filter((category) => !hiddenLocationCategorySet.has(category)),
    [assessedByLocationCategory.categories, hiddenLocationCategorySet]
  );
  const filteredCategoryData = useMemo(
    () => data.filter((row) => visibleLocationCategories.includes(displayName(row.category))),
    [data, visibleLocationCategories]
  );
  const classificationBreakdown = useMemo(() => {
    const map = new Map<
      string,
      { assessed: number; total: number }
    >();
    filteredCategoryData.forEach((row) => {
      const label = normalizeClassificationLabel(row.classification);
      const entry = map.get(label) ?? { assessed: 0, total: 0 };
      entry.total += 1;
      if (row.assessed) entry.assessed += 1;
      map.set(label, entry);
    });
    return Array.from(map.entries())
      .map(([label, counts]) => {
        const notAssessed = counts.total - counts.assessed;
        const pct = (val: number) => (counts.total === 0 ? 0 : Math.round((val / counts.total) * 1000) / 10);
        return {
          label,
          ...counts,
          notAssessed,
          assessedPct: pct(counts.assessed),
          notAssessedPct: pct(notAssessed),
        };
      })
      .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
  }, [filteredCategoryData]);
  const classificationSummary = useMemo(() => {
    const totals = classificationBreakdown.reduce(
      (acc, item) => {
        acc.assessed += item.assessed;
        acc.total += item.total;
        return acc;
      },
      { assessed: 0, total: 0 }
    );
    const pct = totals.total === 0 ? 0 : Math.round((totals.assessed / totals.total) * 1000) / 10;
    return { assessed: totals.assessed, total: totals.total, pct };
  }, [classificationBreakdown]);
  const locationSummary = useMemo(() => {
    const totals = assessedByLocationCategory.rows.reduce(
      (acc, row) => {
        visibleLocationCategories.forEach((category) => {
          acc.assessed += Number(row?.[`${category}__assessed`] ?? 0);
          acc.total += Number(row?.[`${category}__total`] ?? 0);
        });
        return acc;
      },
      { assessed: 0, total: 0 }
    );
    const pct = totals.total === 0 ? 0 : Math.round((totals.assessed / totals.total) * 1000) / 10;
    return { assessed: totals.assessed, total: totals.total, pct };
  }, [assessedByLocationCategory.rows, visibleLocationCategories]);
  const toggleLocationCategory = useCallback((category: string) => {
    setHiddenLocationCategories((prev) =>
      prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category]
    );
  }, []);
  const handleClassificationBarClick = useCallback(
    (data: any, _index: number, event: any) => {
      const label = data?.payload?.label;
      if (!label) return;
      if (classificationContainerRef.current && event) {
        const rect = classificationContainerRef.current.getBoundingClientRect();
        const clientX = event?.clientX ?? event?.pageX;
        const clientY = event?.clientY ?? event?.pageY;
        if (clientX != null && clientY != null) {
          setClassificationPopoverPosition({
            left: clientX - rect.left,
            top: clientY - rect.top,
          });
        }
      }
      const categoryMap = new Map<string, { assessed: number; total: number }>();
      filteredCategoryData.forEach((row) => {
        if (normalizeClassificationLabel(row.classification) !== label) return;
        const category = displayName(row.category);
        const entry = categoryMap.get(category) ?? { assessed: 0, total: 0 };
        entry.total += 1;
        if (row.assessed) entry.assessed += 1;
        categoryMap.set(category, entry);
      });
      const categories = Array.from(categoryMap.entries())
        .map(([category, counts]) => ({
          label: category,
          assessed: counts.assessed,
          notAssessed: counts.total - counts.assessed,
          total: counts.total,
        }))
        .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
      const totals = categories.reduce(
        (acc, item) => {
          acc.assessed += item.assessed;
          acc.total += item.total;
          return acc;
        },
        { assessed: 0, total: 0 }
      );
      setClassificationPopoverSummary({
        label,
        assessed: totals.assessed,
        notAssessed: totals.total - totals.assessed,
        total: totals.total,
        categories,
      });
      setClassificationPopoverOpen(true);
    },
    [filteredCategoryData]
  );

  const filteredData = useMemo(
    () =>
      data.filter((row) => {
        const isDisposed = String(row.record_status || "").toLowerCase() === "disposed";
        if (hideDisposed && isDisposed) return false;
        if (!visibleLocationCategories.includes(displayName(row.category))) return false;
        return true;
      }),
    [data, hideDisposed, visibleLocationCategories]
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

  const handleResendEmail = useCallback(async (assessmentId?: number) => {
    if (!assessmentId) {
      toast.error("No assessment available to resend");
      return;
    }
    try {
      setResendingId(assessmentId);
      await authenticatedApi.post(`/api/compliance/it-assess/${assessmentId}/resend-email`);
      toast.success("Assessment email resent");
    } catch (error) {
      console.error("Failed to resend assessment email", error);
      toast.error("Failed to resend assessment email");
    } finally {
      setResendingId(null);
    }
  }, []);

  const columns: ColumnDef<PcAssessmentRow>[] = useMemo(() => {
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
      {
        key: "classification",
        header: "Classification",
        filter: "singleSelect",
        filterParams: { options: uniqueOptions(data.map((d) => d.classification || "")) },
        render: (row) => row.classification || "-",
      },
      {
        key: "category",
        header: "Category",
        filter: "singleSelect",
        filterParams: { options: categoryFilterOptions },
        render: (row) => displayName(row.category),
      },
      { key: "owner", header: "Owner", filter: "input", render: (row) => displayName(row.owner) },
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
        key: "disposed_date",
        header: "Disposed Date",
        filter: "date",
        render: (row) => formatDate(row.disposed_date),
      },
      {
        key: "action",
        header: "Action",
        render: (row) => {
          const lastAssessmentId =
            row.last_assessment?.id ??
            (Array.isArray(row.assessments) && row.assessments.length > 0
              ? row.assessments[row.assessments.length - 1]?.id
              : undefined);
          const isResending = resendingId === lastAssessmentId;
          const showResend = row.assessed && !!lastAssessmentId;

          return (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-600 hover:text-blue-800"
                onClick={() => handleOpenRow(row)}
              >
                <Eye className="h-4 w-4 mr-1" />
                Assess
              </Button>
              {showResend && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-emerald-600 hover:text-emerald-800"
                  disabled={isResending}
                  onClick={() => handleResendEmail(lastAssessmentId)}
                >
                  <Send className="h-4 w-4 mr-1" />
                  {isResending ? "Sending..." : "Resend Email"}
                </Button>
              )}
            </div>
          );
        },
      },
    ];
  }, [data, handleOpenRow, handleResendEmail, resendingId]);
  const columnsKey = useMemo(() => columns.map((col) => String(col.key)).join("|"), [columns]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">IT Assessment Record</h1>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Assessment records for IT Hardware
          </p>
        </div>
      </div>
      {/* Assessment summary removed in favor of classification breakdown */}
      <div className="grid gap-3 lg:grid-cols-[7fr_3fr]">
        <Card className="border-stone-300 bg-stone-200/30">
          <CardHeader className="px-3 pb-1 pt-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Assessed by Location
              </CardTitle>
              <span className="text-xs font-semibold text-muted-foreground">
                {locationSummary.assessed}/{locationSummary.total} ({locationSummary.pct.toFixed(1)}%)
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 px-3 pb-3 pt-0">
            {assessedByLocationCategory.rows.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={assessedByLocationCategory.rows} margin={{ top: 8, right: 10, left: 0, bottom: 32 }}>
                    <XAxis
                      dataKey="location"
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={48}
                      tick={{ fontSize: 11, fill: "#374151" }}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const row = payload[0]?.payload as Record<string, any>;
                        return (
                          <div className="rounded-md border bg-white px-3 py-2 text-xs shadow-md">
                            <div className="mb-2 font-semibold">Location: {label}</div>
                            <div className="space-y-1">
                              {visibleLocationCategories.map((category, idx) => {
                                const assessed = Number(row?.[`${category}__assessed`] ?? 0);
                                const total = Number(row?.[`${category}__total`] ?? 0);
                                if (total === 0) return null;
                                return (
                                  <div key={category} className="flex items-center justify-between gap-4">
                                    <span className="flex items-center gap-2">
                                    <span
                                      className="inline-block h-2 w-2 rounded-sm"
                                      style={{ backgroundColor: categoryColors[idx % categoryColors.length] }}
                                    />
                                    {category}
                                    </span>
                                    <span className="font-medium">
                                      {assessed}/{total} assessed
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Legend
                      content={() => (
                        <ul className="flex flex-wrap items-center justify-center gap-3 text-xs">
                          {assessedByLocationCategory.categories.map((category, idx) => {
                            const hidden = hiddenLocationCategorySet.has(category);
                            return (
                              <li
                                key={category}
                                className="flex items-center gap-1 cursor-pointer select-none"
                                onClick={() => toggleLocationCategory(category)}
                              >
                                <span
                                  className="inline-block h-3 w-3 rounded-sm"
                                  style={{ backgroundColor: categoryColors[idx % categoryColors.length], opacity: hidden ? 0.35 : 1 }}
                                />
                                <span className={hidden ? "line-through text-muted-foreground" : ""}>
                                  {category}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    />
                    {visibleLocationCategories.map((category, idx) => {
                      const color = categoryColors[idx % categoryColors.length];
                      return (
                        <React.Fragment key={category}>
                          <Bar
                            dataKey={`${category}__assessed`}
                            stackId={category}
                            fill={color}
                            name={category}
                          />
                          <Bar
                            dataKey={`${category}__unassessed`}
                            stackId={category}
                            fill={lightenColor(color)}
                            legendType="none"
                          />
                        </React.Fragment>
                      );
                    })}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="px-3 py-2 text-sm text-muted-foreground">No location data</CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
        <Card className="border-stone-300 bg-stone-200/30">
          <CardHeader className="px-3 pb-1 pt-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Classification Breakdown
              </CardTitle>
              <span className="text-xs font-semibold text-muted-foreground">
                {classificationSummary.assessed}/{classificationSummary.total} ({classificationSummary.pct.toFixed(1)}%)
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-3 pb-3 pt-0">
            {classificationBreakdown.length > 0 ? (
              <Popover
                open={classificationPopoverOpen}
                onOpenChange={(open) => {
                  setClassificationPopoverOpen(open);
                  if (!open) setClassificationPopoverSummary(null);
                }}
              >
                <div className="relative h-64 w-full" ref={classificationContainerRef}>
                  <PopoverAnchor asChild>
                    <span
                      aria-hidden
                      style={{
                        position: "absolute",
                        top: classificationPopoverPosition ? `${classificationPopoverPosition.top}px` : "50%",
                        left: classificationPopoverPosition ? `${classificationPopoverPosition.left}px` : "50%",
                        width: 1,
                        height: 1,
                      }}
                    />
                  </PopoverAnchor>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={classificationBreakdown} margin={{ top: 8, right: 10, left: 0, bottom: 32 }}>
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={44}
                        tick={{ fontSize: 11, fill: "#374151" }}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const row = payload[0]?.payload as any;
                          return (
                            <div className="rounded-md border bg-white px-3 py-2 text-xs shadow-md">
                              <div className="mb-2 font-semibold">{label}</div>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-4">
                                  <span className="flex items-center gap-2">
                                    <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500" />
                                    Assessed
                                  </span>
                                  <span className="font-medium">
                                    {row.assessed} ({row.assessedPct.toFixed(1)}%)
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                  <span className="flex items-center gap-2">
                                    <span className="inline-block h-2 w-2 rounded-sm bg-amber-400" />
                                    Not Assessed
                                  </span>
                                  <span className="font-medium">
                                    {row.notAssessed} ({row.notAssessedPct.toFixed(1)}%)
                                  </span>
                                </div>
                                <div className="pt-1 text-[11px] text-muted-foreground">Total: {row.total}</div>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="assessed"
                        stackId="a"
                        name="Assessed"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                        onClick={handleClassificationBarClick}
                      />
                      <Bar
                        dataKey="notAssessed"
                        stackId="a"
                        name="Not Assessed"
                        fill="#fbbf24"
                        radius={[4, 4, 0, 0]}
                        onClick={handleClassificationBarClick}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <PopoverContent className="w-64 text-xs bg-stone-100 shadow-lg" side="bottom" align="center" sideOffset={8}>
                  {classificationPopoverSummary ? (
                    <div className="space-y-2">
                      <div className="font-semibold">Classification: {classificationPopoverSummary.label}</div>
                      <div className="flex items-center justify-between text-xs text-blue-600">
                        <span>Total</span>
                        <span>
                          {classificationPopoverSummary.assessed}/{classificationPopoverSummary.total}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {classificationPopoverSummary.categories.map((item) => (
                          <div key={item.label} className="flex items-center justify-between gap-3">
                            <span className="truncate">{item.label}</span>
                            <span className="font-medium">
                              {item.assessed}/{item.total}
                            </span>
                          </div>
                        ))}
                        {classificationPopoverSummary.categories.length === 0 && (
                          <div className="text-[11px] text-muted-foreground">No category data.</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-muted-foreground">Click a bar to see category breakdown.</div>
                  )}
                </PopoverContent>
              </Popover>
            ) : (
              <Card className="border-dashed">
                <CardContent className="px-3 py-2 text-sm text-muted-foreground">No classification data</CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="flex items-stretch ml-auto gap-4 justify-end">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Hide disposed</span>
          <Switch checked={hideDisposed} onCheckedChange={setHideDisposed} />
        </div>
        <ExcelItAssessReportButton />
        <Button onClick={handleCreate} className="gap-2 w-full sm:w-auto" disabled={loading}>
          <Plus className="h-4 w-4" />
          {loading ? "Loading..." : "Create"}
        </Button>
      </div>
      <CustomDataGrid
        key={columnsKey}
        data={filteredData}
        columns={columns}
        pageSize={10}
        pagination={false}
        inputFilter={false}
        dataExport={false}
        onRowDoubleClick={handleOpenRow}
        rowClass={(row) =>
          row.asset_status === "new"
            ? "bg-amber-100/70"
            : row.assessed
              ? "bg-green-200/50"
              : "even:bg-gray-50 dark:even:bg-slate-700 dark:odd:bg-slate-800"
        }
      />
    </div>
  );
};

export default PcAssessmentRecord;
