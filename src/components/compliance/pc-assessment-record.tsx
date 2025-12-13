"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CustomDataGrid, ColumnDef } from "@/components/ui/DataGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { authenticatedApi } from "@/config/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type PcAssessmentRow = {
  id: number;
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCostcenter, setSelectedCostcenter] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await authenticatedApi.get("/api/assets", {
        params: { type: 1, status: "active" },
      });
      const list = Array.isArray(res?.data?.data)
        ? res.data.data
        : Array.isArray(res?.data)
          ? res.data
          : [];
      setData(list as PcAssessmentRow[]);
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

  const filteredData = useMemo(
    () =>
      data.filter((row) => {
        const categoryMatch =
          !selectedCategory || displayName(row.category) === selectedCategory;
        const costcenterMatch =
          !selectedCostcenter || displayName(row.costcenter) === selectedCostcenter;
        const locationMatch =
          !selectedLocation || displayName(row.location) === selectedLocation;
        return categoryMatch && costcenterMatch && locationMatch;
      }),
    [data, selectedCategory, selectedCostcenter, selectedLocation]
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
    const categoryOptions = uniqueOptions(
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
    const locationOptions = uniqueOptions(
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
        filterParams: { options: categoryOptions },
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
        filterParams: { options: locationOptions },
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
        key: "fuel_type",
        header: "Fuel Type",
        filter: "singleSelect",
        filterParams: { options: fuelOptions },
        render: (row) => row.fuel_type || "-",
      },
      {
        key: "transmission",
        header: "Transmission",
        filter: "singleSelect",
        filterParams: { options: transmissionOptions },
        render: (row) => row.transmission || "-",
      },
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
        <Button onClick={handleCreate} className="gap-2" disabled={loading}>
          <Plus className="h-4 w-4" />
          {loading ? "Loading..." : "Create"}
        </Button>
      </div>
      <>
        <SummaryRow
          title="By Category"
          items={categorySummary}
          active={selectedCategory}
          onSelect={(label) =>
            setSelectedCategory((prev) => (prev === label ? null : label))
          }
        />
        <SummaryRow
          title="By Cost Center"
          items={costcenterSummary}
          active={selectedCostcenter}
          onSelect={(label) =>
            setSelectedCostcenter((prev) => (prev === label ? null : label))
          }
        />
        <SummaryRow
          title="By Location"
          items={locationSummary}
          active={selectedLocation}
          onSelect={(label) =>
            setSelectedLocation((prev) => (prev === label ? null : label))
          }
        />
      </>
      <CustomDataGrid
        data={filteredData}
        columns={columns}
        pageSize={10}
        pagination={false}
        inputFilter={false}
        dataExport={false}
        onRowDoubleClick={handleOpenRow}
      />
    </div>
  );
};

type SummaryRowProps = {
  title: string;
  items: { label: string; count: number }[];
  active: string | null;
  onSelect: (label: string) => void;
};

const SummaryRow: React.FC<SummaryRowProps> = ({ title, items, active, onSelect }) => {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const isActive = active === item.label;
          return (
            <Card
              key={`${title}-${item.label}`}
              className={cn(
                "min-w-[125px] flex-1 cursor-pointer border-fuchsia-200 bg-fuchsia-50/50 transition sm:flex-none",
                "hover:border-primary hover:bg-primary/10",
                isActive && "border-primary bg-fuchsia-300/50 text-primary"
              )}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(item.label)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(item.label);
                }
              }}
            >
              <CardContent className="flex items-center justify-between px-3 py-2">
                <span className="truncate">{item.label}</span>
                <Badge variant={isActive ? "secondary" : "outline"} className="bg-blue-200">{item.count}</Badge>
              </CardContent>
            </Card>
          );
        })}
        {items.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="px-3 py-2 text-sm text-muted-foreground">No data available</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PcAssessmentRecord;
