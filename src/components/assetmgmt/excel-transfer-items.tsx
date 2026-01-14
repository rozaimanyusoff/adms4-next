"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ExcelTransferItemsProps {
  items: any[];
}

const ExcelTransferItems: React.FC<ExcelTransferItemsProps> = ({ items }) => {
  const [exporting, setExporting] = useState(false);

  const formatDateTime = (val?: any) => {
    if (!val) return "";
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
  };

  const formatDate = (val?: any) => {
    if (!val) return "";
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
  };

  const resolveName = (v: any) => v?.full_name || v?.name || v?.ramco_id || v || "";
  const normalizePerson = (v: any) => {
    if (Array.isArray(v)) {
      return v.map(resolveName).filter(Boolean).join(", ");
    }
    return resolveName(v);
  };

  const mapRows = () => {
    return (items || []).map((item: any) => {
      const rawStatus =
        item?.status ||
        item?.acceptance_status ||
        item?.approval_status ||
        item?.transfer_status ||
        item?.status_label ||
        "";

      return {
        "Item ID": item?.id ?? "",
        "Transfer ID": item?.transfer_id ?? item?.transfer?.id ?? "",
        "Transfer By": normalizePerson(item?.transfer_by),
        "New Owner": normalizePerson(item?.new_owner),
        "Type": item?.asset?.type?.name || item?.type?.name || "",
        "Register Number": item?.asset?.register_number || item?.asset?.id || "",
        "Current Owner": normalizePerson(item?.current_owner),
        "Application Date": formatDateTime(item?.transfer_date),
        "Effective Date": formatDate(item?.effective_date),
        "Approval Date": formatDateTime(item?.approval_date || item?.approved_date),
        "Acceptance Date": formatDateTime(item?.acceptance_date),
        Status: rawStatus,
      } as Record<string, string>;
    });
  };

  const handleExport = async () => {
    const rows = mapRows();
    if (!rows.length) {
      toast.info("No transfer items to export.");
      return;
    }
    setExporting(true);
    try {
      const ExcelJS = (await import("exceljs")) as typeof import("exceljs");
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Transfer Items");
      const headers = Object.keys(rows[0] || {});

      // Title row
      const title = "Asset Transfer Items";
      const titleRow = sheet.addRow([title]);
      sheet.mergeCells(1, 1, 1, headers.length);
      titleRow.getCell(1).font = { bold: true, size: 14 };
      titleRow.getCell(1).alignment = { horizontal: "center" };

      // Header row
      const headerRow = sheet.addRow(headers);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF1E3A8A" }, // blue header
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      });

      // Data rows
      rows.forEach((row) => {
        const dataRow = sheet.addRow(headers.map((h) => (row as Record<string, string>)[h] ?? ""));
        dataRow.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
          cell.alignment = { vertical: "top", wrapText: true };
        });
      });

      // Column widths (avoid hidden columns)
      sheet.columns = headers.map((h) => {
        const colValues = [h, ...rows.map((r) => (r as Record<string, string>)[h] ?? "")];
        const maxLen = Math.max(...colValues.map((v) => (v ? String(v).length : 0)), 12);
        return { header: h, width: Math.min(50, Math.max(12, maxLen + 2)) };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `transfer_items_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to export transfer items", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={exporting}
      className="flex items-center gap-2 border-emerald-600"
      title="Export transfer items to Excel"
    >
      {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 text-emerald-600" />}
      Export
    </Button>
  );
};

export default ExcelTransferItems;
