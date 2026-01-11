"use client";

import React, { useMemo, useState } from "react";
import ExcelJS, { type Borders, type BorderStyle, type FillPattern, type Worksheet } from "exceljs";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FlatPurchase } from "./types";

interface ExcelPurchaseItemsProps {
  purchases: FlatPurchase[];
}

interface ExportRow {
  id: number;
  type: string;
  category: string;
  requestType: string;
  costcenter: string;
  purchaseYear: number | "";
  prDate: string;
  prNo: string;
  requestedBy: string;
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
  supplier: string;
  brand: string;
  poDate: string;
  poNo: string;
  doDate: string;
  doNo: string;
  invDate: string;
  invNo: string;
  grnDate: string;
  grnNo: string;
  status: string;
}

const formatDate = (val?: string | null) => {
  if (!val) return "";
  const parsed = new Date(val);
  if (Number.isNaN(parsed.getTime())) return String(val);
  return parsed.toLocaleDateString("en-GB");
};

const formatTimestamp = () => {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getDate())}${pad(d.getMonth() + 1)}${d.getFullYear()}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

const statusLabel = (status?: string) => {
  if (status === "registered") return "Handed Over";
  if (status === "unregistered") return "Unregistered";
  return "Undelivered";
};

const headerFill: FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } }; // blue
const headerFont = { bold: true, color: { argb: "FFFFFFFF" } };
const thinBorder: Partial<Borders> = {
  top: { style: "thin" as BorderStyle },
  bottom: { style: "thin" as BorderStyle },
  left: { style: "thin" as BorderStyle },
  right: { style: "thin" as BorderStyle },
};

const colLetter = (index: number) => {
  let dividend = index;
  let columnName = "";
  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    dividend = Math.floor((dividend - modulo) / 26);
  }
  return columnName;
};

const fmtNumber = (num: number | undefined, decimals = 0) => {
  if (num === undefined || num === null) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((Number(num) || 0) * factor) / factor;
};

const normalizeRow = (p: FlatPurchase): ExportRow => {
  const unitPrice = Number(p.unit_price) || 0;
  const total = Number.isFinite(Number(p.total_amount)) ? Number(p.total_amount) : unitPrice * (p.qty || 0);
  const prDate = p.pr_date || p.request?.pr_date || "";
  const typeName = p.type_name || (typeof p.type === "string" ? p.type : (p.type?.name || ""));
  const requestType = p.request_type || p.request?.request_type || "";
  const costcenter = p.costcenter_name || p.request?.costcenter?.name || (typeof p.costcenter === "string" ? p.costcenter : (p.costcenter as any)?.name || "");
  const category = p.category_name || (typeof p.category === "string" ? p.category : (p.category?.name || ""));
  const purchaseYear =
    p.purchase_year ||
    (prDate ? new Date(prDate).getFullYear() : undefined);

  return {
    id: p.id,
    type: typeName || "",
    category: category || "",
    requestType,
    costcenter: costcenter || "",
    purchaseYear: purchaseYear || "",
    prDate: formatDate(prDate),
    prNo: p.pr_no || "",
    requestedBy: p.pic || "",
    description: p.description || p.items || "",
    qty: p.qty || 0,
    unitPrice,
    total,
    supplier: p.supplier_name || "",
    brand: p.brand_name || "",
    poDate: formatDate(p.po_date),
    poNo: p.po_no || "",
    doDate: formatDate(p.do_date),
    doNo: p.do_no || "",
    invDate: formatDate(p.inv_date),
    invNo: p.inv_no || "",
    grnDate: formatDate(p.grn_date),
    grnNo: p.grn_no || "",
    status: statusLabel(p.status)
  };
};

const ExcelPurchaseItems: React.FC<ExcelPurchaseItemsProps> = ({ purchases }) => {
  const [exporting, setExporting] = useState(false);
  const rows = useMemo(() => purchases.map(normalizeRow), [purchases]);

  const buildTypeSummary = (sheet: Worksheet) => {
    const typeTotals: Record<string, { count: number; total: number; years: Record<string, number> }> = {};
    const years = new Set<string>();

    rows.forEach(row => {
      const type = row.type || "Unspecified";
      const year = row.purchaseYear ? String(row.purchaseYear) : "Unknown";
      years.add(year);
      if (!typeTotals[type]) typeTotals[type] = { count: 0, total: 0, years: {} };
      typeTotals[type].count += 1;
      typeTotals[type].total += row.total || 0;
      typeTotals[type].years[year] = (typeTotals[type].years[year] || 0) + (row.total || 0);
    });

    const sortedYears = Array.from(years).sort((a, b) => {
      const ay = Number(a);
      const by = Number(b);
      if (Number.isNaN(ay)) return 1;
      if (Number.isNaN(by)) return -1;
      return by - ay;
    });

    sheet.addRow(["Summary by Type"]).font = { bold: true, size: 12 };
    const header = sheet.addRow(["Type", "Count", "Total (RM)", ...sortedYears]);
    header.eachCell(cell => { cell.font = headerFont; cell.fill = headerFill; cell.border = thinBorder; });

    Object.entries(typeTotals)
      .sort((a, b) => b[1].total - a[1].total)
      .forEach(([type, data]) => {
        const rowValues = [
          type,
          data.count,
          fmtNumber(data.total, 2),
          ...sortedYears.map(y => fmtNumber(data.years[y] || 0, 2))
        ];
        const row = sheet.addRow(rowValues);
        row.eachCell((cell, colNumber) => {
          cell.border = thinBorder;
          if (colNumber === 2) cell.numFmt = "#,##0";
          if (colNumber >= 3) cell.numFmt = "#,##0.00";
        });
      });
  };

  const buildYearSummary = (sheet: Worksheet) => {
    const yearTotals: Record<string, { count: number; total: number }> = {};
    rows.forEach(row => {
      const key = row.purchaseYear ? String(row.purchaseYear) : "Unknown";
      if (!yearTotals[key]) yearTotals[key] = { count: 0, total: 0 };
      yearTotals[key].count += 1;
      yearTotals[key].total += row.total || 0;
    });

    sheet.addRow([]);
    sheet.addRow(["Purchases by Year"]).font = { bold: true, size: 12 };
    const header = sheet.addRow(["Year", "Count", "Total (RM)"]);
    header.eachCell(cell => { cell.font = headerFont; cell.fill = headerFill; cell.border = thinBorder; });

    Object.entries(yearTotals)
      .sort((a, b) => {
        const ay = Number(a[0]);
        const by = Number(b[0]);
        if (Number.isNaN(ay)) return 1;
        if (Number.isNaN(by)) return -1;
        return by - ay;
      })
      .forEach(([year, data]) => {
        const row = sheet.addRow([year, data.count, fmtNumber(data.total, 2)]);
        row.eachCell((cell, colNumber) => {
          cell.border = thinBorder;
          if (colNumber === 2) cell.numFmt = "#,##0";
          if (colNumber === 3) cell.numFmt = "#,##0.00";
        });
      });
  };

  const buildTypeCostcenterSummary = (sheet: Worksheet) => {
    const typeCcCounts: Record<string, Record<string, number>> = {};
    const costcenters = new Set<string>();

    rows.forEach(row => {
      const type = row.type || "Unspecified";
      const cc = row.costcenter || "Unknown";
      costcenters.add(cc);
      if (!typeCcCounts[type]) typeCcCounts[type] = {};
      if (!typeCcCounts[type][cc]) typeCcCounts[type][cc] = 0;
      typeCcCounts[type][cc] += 1;
    });

    const ccList = Array.from(costcenters).sort((a, b) => a.localeCompare(b));

    sheet.addRow([]);
    sheet.addRow(["Type by Cost Center"]).font = { bold: true, size: 12 };
    const header = sheet.addRow(["Type", ...ccList]);
    header.eachCell(cell => { cell.font = headerFont; cell.fill = headerFill; cell.border = thinBorder; });

    Object.entries(typeCcCounts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([type, counts]) => {
        const rowValues = [type, ...ccList.map(cc => counts[cc] || 0)];
        const row = sheet.addRow(rowValues);
        row.eachCell((cell, colNumber) => {
          cell.border = thinBorder;
          if (colNumber > 1) cell.numFmt = "#,##0";
        });
      });
  };

const buildRecordsSheet = (sheet: Worksheet) => {
  if (!rows.length) return;
    const headers = [
      "ID",
      "Request Type",
      "Type",
      "Category",
      "Purchase Year",
      "PR Date",
      "PR Number",
      "Requested By",
      "Cost Center",
      "Description",
      "Qty",
      "Unit Price",
      "Total (RM)",
      "Supplier",
      "Brand",
      "PO Date",
      "PO Number",
      "DO Date",
      "DO Number",
      "Invoice Date",
      "Invoice Number",
      "GRN Date",
      "GRN Number",
      "Status"
    ];
    const titleRow = sheet.addRow(["Purchase Records"]);
    titleRow.font = { bold: true, size: 14 };
    sheet.mergeCells(`A${titleRow.number}:${colLetter(headers.length)}${titleRow.number}`);

    const headerRow = sheet.addRow(headers);
    headerRow.eachCell(cell => { cell.font = headerFont; cell.fill = headerFill; cell.border = thinBorder; });

    rows.forEach(r => {
      const row = sheet.addRow([
        r.id,
        r.requestType,
        r.type,
        r.category,
        r.purchaseYear,
        r.prDate,
        r.prNo,
        r.requestedBy,
        r.costcenter,
        r.description,
        r.qty,
        r.unitPrice,
        r.total,
        r.supplier,
        r.brand,
        r.poDate,
        r.poNo,
        r.doDate,
        r.doNo,
        r.invDate,
        r.invNo,
        r.grnDate,
        r.grnNo,
        r.status
      ]);
      row.eachCell((cell, colNumber) => {
        cell.border = thinBorder;
        if (colNumber === 11) cell.numFmt = "#,##0";
        if (colNumber === 12 || colNumber === 13) cell.numFmt = "#,##0.00";
      });
    });

    sheet.columns.forEach(col => {
      if (!col) return;
      let max = 10;
      if (col.eachCell) {
        col.eachCell({ includeEmpty: true }, cell => {
          const val = cell.value ? cell.value.toString() : "";
          max = Math.max(max, val.length + 2);
        });
      }
      col.width = Math.min(max, 40);
    });
  };

  const handleExport = async () => {
    if (!rows.length) {
      toast.error("No purchase records to export");
      return;
    }
    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const summarySheet = workbook.addWorksheet("Purchase Summary");
      buildTypeSummary(summarySheet);
      buildTypeCostcenterSummary(summarySheet);
      buildYearSummary(summarySheet);

      const recordsSheet = workbook.addWorksheet("Purchase Records");
      buildRecordsSheet(recordsSheet);

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `purchase-items-${formatTimestamp()}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export purchase items", err);
      toast.error("Failed to export purchase items");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleExport}
      disabled={exporting}
      className="bg-emerald-600 text-white hover:bg-emerald-100 hover:text-dark"
    >
      {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
    </Button>
  );
};

export default ExcelPurchaseItems;
