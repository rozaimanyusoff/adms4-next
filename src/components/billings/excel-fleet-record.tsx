'use client';

import React, { useState } from "react";
import ExcelJS from "exceljs";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";

type FleetRow = {
  card_no?: string | null;
  vendor?: { name?: string | null } | null;
  asset?: {
    register_number?: string | null;
    costcenter?: { name?: string | null } | null;
    fuel_type?: string | null;
    purpose?: string | null;
    id?: number | null;
  } | null;
  pin_no?: string | null;
  status?: string | null;
  reg_date?: string | null;
  expiry?: string | null;
  remarks?: string | null;
};

type ExcelFleetRecordProps = {
  rows: FleetRow[];
  duplicateAssetRegisters?: string[];
};

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const ExcelFleetRecord: React.FC<ExcelFleetRecordProps> = ({ rows, duplicateAssetRegisters = [] }) => {
  const [exporting, setExporting] = useState(false);

  const buildSummarySheet = (workbook: ExcelJS.Workbook) => {
    const sheet = workbook.addWorksheet("Summary");
    sheet.columns = [
      { header: "Metric", key: "metric", width: 28 },
      { header: "Value", key: "value", width: 18 },
    ];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeMonths = new Date(today);
    threeMonths.setMonth(threeMonths.getMonth() + 3);

    let active = 0;
    let expired = 0;
    let expiring = 0;
    rows.forEach(r => {
      const status = (r.status || "").toLowerCase();
      const expiryDate = r.expiry ? new Date(r.expiry) : null;
      const isExpired = status === "expired" || (expiryDate ? (expiryDate.setHours(0, 0, 0, 0), expiryDate < today) : false);
      if (status === "active") active++;
      if (isExpired) expired++;
      if (expiryDate && expiryDate >= today && expiryDate <= threeMonths) expiring++;
    });

    sheet.addRows([
      ["Total Cards", rows.length],
      ["Active", active],
      ["Expired", expired],
      ["Expiring < 3 months", expiring],
      ["Assets with duplicate cards", duplicateAssetRegisters.length],
    ]);

    sheet.getRow(1).font = { bold: true };
    sheet.getColumn(1).font = { bold: true };
  };

  const buildRecordsSheet = (workbook: ExcelJS.Workbook) => {
    const sheet = workbook.addWorksheet("Fleet Records");
    sheet.columns = [
      { header: "Card No", key: "card_no", width: 16 },
      { header: "Vendor", key: "vendor", width: 22 },
      { header: "Register Number", key: "register_number", width: 18 },
      { header: "Cost Center", key: "costcenter", width: 22 },
      { header: "Fuel Type", key: "fuel_type", width: 14 },
      { header: "Purpose", key: "purpose", width: 14 },
      { header: "Status", key: "status", width: 12 },
      { header: "Reg Date", key: "reg_date", width: 12 },
      { header: "Expiry", key: "expiry", width: 12 },
      { header: "PIN", key: "pin", width: 14 },
      { header: "Remarks", key: "remarks", width: 40 },
    ];

    rows.forEach(r => {
      sheet.addRow({
        card_no: r.card_no || "",
        vendor: r.vendor?.name || "",
        register_number: r.asset?.register_number || "",
        costcenter: r.asset?.costcenter?.name || "",
        fuel_type: r.asset?.fuel_type || "",
        purpose: r.asset?.purpose || "",
        status: r.status || "",
        reg_date: formatDate(r.reg_date),
        expiry: formatDate(r.expiry),
        pin: r.pin_no || "",
        remarks: r.remarks || "",
      });
    });

    // style header
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(1).border = {
      bottom: { style: "thin" },
    };
  };

  const handleExport = async () => {
    if (!rows.length) {
      toast.error("No fleet records to export");
      return;
    }
    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      buildSummarySheet(workbook);
      buildRecordsSheet(workbook);

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
      a.download = `fleet-record-${timestamp}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export fleet records", err);
      toast.error("Failed to export fleet records");
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
      className="border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white"
    >
      {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
    </Button>
  );
};

export default ExcelFleetRecord;
