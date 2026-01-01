'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { authenticatedApi } from '@/config/api';
import ExcelJS from 'exceljs';
import { toast } from 'sonner';

type AssetInfo = {
  register_number?: string;
  fuel_type?: string;
  costcenter?: { name?: string };
  location?: { name?: string };
  owner?: { full_name?: string; ramco_id?: string };
};

type WorkshopInfo = { name?: string };

type MaintenanceBill = {
  inv_id?: number;
  inv_no?: string | null;
  inv_date?: string | null;
  svc_order?: string | null;
  svc_date?: string | null;
  svc_odo?: string | null;
  inv_total?: string | number | null;
  inv_stat?: string | null;
  inv_remarks?: string | null;
  form_upload_date?: string | null;
  asset?: AssetInfo | null;
  workshop?: WorkshopInfo | null;
};

const formatDate = (value?: string | null) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-GB');
};

const toNumber = (value?: string | number | null): number => {
  if (value === null || value === undefined || value === '') return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const formatNumber = (value?: string | number | null) => {
  const num = toNumber(value);
  return num === 0 && (value === null || value === undefined || value === '') ? '' : num.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const autoFitColumns = (sheet: ExcelJS.Worksheet, minWidth = 10, maxWidth = 42) => {
  sheet.columns?.forEach((col) => {
    let max = minWidth;
    col.eachCell?.({ includeEmpty: true }, (cell) => {
      const val = cell.value;
      const text = val === null || val === undefined ? '' : typeof val === 'object' ? JSON.stringify(val) : String(val);
      max = Math.max(max, text.length + 2);
    });
    col.width = Math.min(max, maxWidth);
  });
};

async function fetchBillsForYear(year: number): Promise<MaintenanceBill[]> {
  const res = await authenticatedApi.get(`/api/bills/mtn?year=${year}`);
  const data = (res.data as { data?: MaintenanceBill[] })?.data;
  return Array.isArray(data) ? data : [];
}

export async function downloadMaintenanceBillReport() {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, idx) => currentYear - idx);
  const headers = [
    'No',
    'Invoice ID',
    'Invoice No',
    'Invoice Date',
    'Service Order',
    'Service Date',
    'Service Odo',
    'Vehicle',
    'Ramco ID',
    'Owner',
    'Fuel Type',
    'Cost Center',
    'Location',
    'Workshop',
    'Invoice Total',
    'Invoice Status',
    'Form Upload Date',
    'Remarks',
  ];

  const workbook = new ExcelJS.Workbook();

  // Collect data for all years first to build summary sheet
  const yearDataMap: Record<number, MaintenanceBill[]> = {};
  for (const year of years) {
    yearDataMap[year] = await fetchBillsForYear(year);
  }

  // Summary sheet (yearly + monthly)
  const summary = workbook.addWorksheet('Summary');
  // Yearly overview
  summary.mergeCells(1, 1, 1, headers.length);
  const summaryTitle = summary.getCell(1, 1);
  summaryTitle.value = 'Maintenance Bill Summary';
  summaryTitle.font = { bold: true, size: 24, underline: true };
  summaryTitle.alignment = { horizontal: 'center' };
  summary.mergeCells(2, 1, 2, headers.length);
  const summaryDisclaimer = summary.getCell(2, 1);
  summaryDisclaimer.value = 'This data was exported from ADMS4. Confidential: This information is for the intended recipient only; any unauthorized use, disclosure, or distribution is strictly prohibited and may be unlawful.';
  summaryDisclaimer.font = { italic: true, color: { argb: 'FF555555' } };
  summaryDisclaimer.alignment = { horizontal: 'center', wrapText: true };
  summary.addRow([]);

  const yearlyHeaders = [
    'Year',
    'Total Bills',
    'Total Invoiced',
    'Invoiced (RM)',
    'Total No Invoice',
    'No Invoiced (RM)',
    'Total Accrued',
    'Accrued (RM)',
    'Total Billings (RM)',
  ];
  const yearlyHeaderRow = summary.addRow(yearlyHeaders);
  yearlyHeaderRow.font = { bold: true };
  yearlyHeaderRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9EAF7' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  const isInvoiced = (bill: MaintenanceBill) => {
    const stat = (bill.inv_stat || '').toString().toLowerCase();
    return stat === '1' || stat === 'invoice' || stat === 'invoiced';
  };

  years.forEach((year) => {
    const bills = yearDataMap[year] || [];
    const totalBills = bills.length;
    const invoicedBills = bills.filter(isInvoiced);
    const nonInvoicedBills = bills.filter((b) => !isInvoiced(b));
    const invoicedAmount = invoicedBills.reduce((sum, b) => sum + toNumber(b.inv_total), 0);
    const nonInvoicedAmount = nonInvoicedBills.reduce((sum, b) => sum + toNumber(b.inv_total), 0);
    const accruedBills = nonInvoicedBills.filter((b) => toNumber(b.inv_total) > 0);
    const accruedAmount = accruedBills.reduce((sum, b) => sum + toNumber(b.inv_total), 0);
    const totalBillings = invoicedAmount + nonInvoicedAmount;

    const row = summary.addRow([
      year,
      totalBills,
      invoicedBills.length,
      formatNumber(invoicedAmount),
      nonInvoicedBills.length,
      formatNumber(nonInvoicedAmount),
      accruedBills.length,
      formatNumber(accruedAmount),
      formatNumber(totalBillings),
    ]);
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });

  summary.addRow([]);

  // Monthly matrix
  const monthHeaders = ['Year', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Total'];
  const monthHeaderRow = summary.addRow(monthHeaders);
  monthHeaderRow.font = { bold: true };
  monthHeaderRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9EAF7' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  const getMonthAmount = (bill: MaintenanceBill) => {
    const amt = toNumber(bill.inv_total);
    if (!amt) return null;
    const dateStr = bill.inv_date || bill.svc_date;
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    return { month: d.getMonth(), amount: amt };
  };

  years.forEach((year) => {
    const bills = yearDataMap[year] || [];
    const monthTotals = new Array(12).fill(0);
    bills.forEach((bill) => {
      const info = getMonthAmount(bill);
      if (!info) return;
      monthTotals[info.month] += info.amount;
    });
    const yearlyTotal = monthTotals.reduce((s, v) => s + v, 0);
    const row = summary.addRow([
      year,
      ...monthTotals.map((v) => formatNumber(v)),
      formatNumber(yearlyTotal),
    ]);
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });

  autoFitColumns(summary, 10, 24);

  for (const year of years) {
    const sheet = workbook.addWorksheet(year.toString());
    sheet.mergeCells(1, 1, 1, headers.length);
    const title = sheet.getCell(1, 1);
    title.value = `Maintenance Bill: ${year}`;
    title.font = { bold: true, size: 24, underline: true };
    title.alignment = { horizontal: 'center' };

    sheet.addRow([]);
    const headerRow = sheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9EAF7' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    const bills = yearDataMap[year] || [];
    bills.forEach((bill, idx) => {
      const row = sheet.addRow([
        idx + 1,
        bill.inv_id ?? '',
        bill.inv_no ?? '',
        formatDate(bill.inv_date),
        bill.svc_order ?? '',
        formatDate(bill.svc_date),
        bill.svc_odo ?? '',
        bill.asset?.register_number ?? '',
        bill.asset?.owner?.ramco_id ?? '',
        bill.asset?.owner?.full_name ?? '',
        bill.asset?.fuel_type ?? '',
        bill.asset?.costcenter?.name ?? '',
        bill.asset?.location?.name ?? '',
        bill.workshop?.name ?? '',
        formatNumber(bill.inv_total),
        bill.inv_stat ?? '',
        formatDate(bill.form_upload_date),
        bill.inv_remarks ?? '',
      ]);
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    autoFitColumns(sheet);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const now = new Date();
  const pad = (v: number) => v.toString().padStart(2, '0');
  const filename = `excel-mtnbill-${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.xlsx`;
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

const MaintenanceBillExcelButton: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      await downloadMaintenanceBillReport();
      toast.success('Maintenance bill report exported');
    } catch (error) {
      console.error('Error downloading maintenance bill report', error);
      toast.error('Failed to export maintenance bill report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="default"
      className="bg-green-600 hover:bg-green-700 text-white"
      onClick={handleDownload}
      disabled={loading}
    >
      {loading ? <Loader2 size={14} className="mr-2 animate-spin" /> : <FileSpreadsheet size={14} className="mr-2" />}
      Export Excel
    </Button>
  );
};

export default MaintenanceBillExcelButton;
