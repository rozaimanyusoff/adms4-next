"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CustomDataGrid, ColumnDef } from "@/components/ui/DataGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, Eye, Send } from "lucide-react";
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

  const overallAssessmentSummary = useMemo(() => {
    const total = data.length;
    const assessed = data.filter((row) => row.assessed).length;
    const notAssessed = total - assessed;
    const pct = (count: number) => (total === 0 ? 0 : Math.round((count / total) * 1000) / 10);
    return {
      total,
      assessed,
      notAssessed,
      assessedPct: pct(assessed),
      notAssessedPct: pct(notAssessed),
    };
  }, [data]);

  const classificationBreakdown = useMemo(() => {
    const map = new Map<
      string,
      { assessed: number; total: number }
    >();
    data.forEach((row) => {
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
  }, [data]);

  const assessedByLocation = useMemo(() => {
    const map = new Map<string, { assessed: number; total: number }>();
    data.forEach((row) => {
      const label = displayName(row.location);
      const entry = map.get(label) ?? { assessed: 0, total: 0 };
      entry.total += 1;
      if (row.assessed) entry.assessed += 1;
      map.set(label, entry);
    });
    return Array.from(map.entries())
      .map(([label, counts]) => ({
        label,
        ...counts,
        percent: counts.total === 0 ? 0 : Math.round((counts.assessed / counts.total) * 1000) / 10,
      }))
      .sort((a, b) => b.assessed - a.assessed || a.label.localeCompare(b.label));
  }, [data]);

  const assessedByCategory = useMemo(() => {
    const map = new Map<string, { assessed: number; total: number }>();
    data.forEach((row) => {
      const label = displayName(row.category);
      const entry = map.get(label) ?? { assessed: 0, total: 0 };
      entry.total += 1;
      if (row.assessed) entry.assessed += 1;
      map.set(label, entry);
    });
    return Array.from(map.entries())
      .map(([label, counts]) => ({
        label,
        ...counts,
        percent: counts.total === 0 ? 0 : Math.round((counts.assessed / counts.total) * 1000) / 10,
      }))
      .sort((a, b) => b.assessed - a.assessed || a.label.localeCompare(b.label));
  }, [data]);

  const filteredData = useMemo(
    () =>
      data.filter((row) => {
        const isDisposed = String(row.record_status || "").toLowerCase() === "disposed";
        if (hideDisposed && isDisposed) return false;
        return true;
      }),
    [data, hideDisposed]
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
      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="border-stone-300 bg-stone-200/30">
          <CardContent className="space-y-2 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assessed by Location</p>
            <div className="grid gap-2 md:grid-cols-2">
              {assessedByLocation.map((item) => {
                const zero = item.assessed === 0;
                return (
                  <div
                    key={item.label}
                    className="flex items-center justify-between px-3 py-1"
                  >
                    <span className={zero ? "text-red-600 font-semibold" : ""}>{item.label}</span>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-semibold ${zero ? "text-red-600" : ""}`}>
                        {item.assessed}/{item.total}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`${zero ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}
                      >
                        {item.percent.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                );
              })}
              {assessedByLocation.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="px-3 py-2 text-sm text-muted-foreground">No location data</CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="border-stone-300 bg-stone-200/30">
          <CardContent className="space-y-2 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assessed by Category</p>
            <div className="grid gap-2 md:grid-cols-2">
              {assessedByCategory.map((item) => {
                const zero = item.assessed === 0;
                return (
                  <div
                    key={item.label}
                    className="flex items-center justify-between px-3 py-1"
                  >
                    <span className={zero ? "text-red-600 font-semibold" : ""}>{item.label}</span>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-semibold ${zero ? "text-red-600" : ""}`}>
                        {item.assessed}/{item.total}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`${zero ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}
                      >
                        {item.percent.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                );
              })}
              {assessedByCategory.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="px-3 py-2 text-sm text-muted-foreground">No category data</CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="border-stone-300 bg-stone-200/30">
          <CardContent className="space-y-3 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Classification Breakdown</p>
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              {classificationBreakdown.map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg bg-stone-300/40 px-4 py-3 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold">{item.label}</span>
                    <Badge variant="outline" className="bg-lime-50 text-lime-700 border-lime-200">
                      {item.total}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Assessed</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{item.assessed}</span>
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          {item.assessedPct.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Not Assessed</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{item.notAssessed}</span>
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                          {item.notAssessedPct.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {classificationBreakdown.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="px-3 py-2 text-sm text-muted-foreground">No classification data</CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="flex items-stretch ml-auto gap-4 justify-end">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Hide disposed</span>
          <Switch checked={hideDisposed} onCheckedChange={setHideDisposed} />
        </div>
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
          row.assessed
            ? "bg-green-200/50"
            : "even:bg-gray-50 dark:even:bg-slate-700 dark:odd:bg-slate-800"
        }
      />
    </div>
  );
};

export default PcAssessmentRecord;
