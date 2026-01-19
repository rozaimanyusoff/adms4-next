'use client';

import React, { useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import ExcelJS from 'exceljs';
import { toast } from 'sonner';

type ItAssessmentRecord = {
  id?: number;
  assessment_year?: number;
  assessment_date?: string | null;
  technician?: string | null;
  technician_name?: string | null;
  overall_score?: number | null;
  remarks?: string | null;
  asset_id?: number | null;
  register_number?: string | null;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  purchase_date?: string | null;
  os_name?: string | null;
  os_version?: string | null;
  os_patch_status?: string | null;
  cpu_manufacturer?: string | null;
  cpu_model?: string | null;
  cpu_generation?: string | null;
  memory_manufacturer?: string | null;
  memory_type?: string | null;
  memory_size_gb?: number | null;
  storage_manufacturer?: string | null;
  storage_type?: string | null;
  storage_size_gb?: number | null;
  graphics_type?: string | null;
  graphics_manufacturer?: string | null;
  graphics_specs?: string | null;
  display_manufacturer?: string | null;
  display_size?: string | null;
  display_resolution?: string | null;
  display_form_factor?: string | null;
  display_interfaces?: string[] | null;
  ports_usb_a?: number | null;
  ports_usb_c?: number | null;
  ports_thunderbolt?: number | null;
  ports_ethernet?: number | null;
  ports_hdmi?: number | null;
  ports_displayport?: number | null;
  ports_vga?: number | null;
  ports_sdcard?: number | null;
  ports_audiojack?: number | null;
  battery_equipped?: number | null;
  battery_capacity?: string | null;
  adapter_equipped?: number | null;
  adapter_output?: string | null;
  av_installed?: string | null;
  av_vendor?: string | null;
  av_status?: string | null;
  av_license?: string | null;
  vpn_installed?: string | null;
  vpn_setup_type?: string | null;
  vpn_username?: string | null;
  installed_software?: string[] | null;
  office_account?: string | null;
  attachment_1?: string | null;
  attachment_2?: string | null;
  attachment_3?: string | null;
  asset_status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  costcenter?: { id?: number; name?: string } | string | null;
  department?: { id?: number; name?: string } | string | null;
  employee?: { full_name?: string; ramco_id?: string } | string | null;
  location?: { id?: number; name?: string } | string | null;
};

const displayName = (value: any) => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return value?.name || value?.full_name || value?.code || value?.label || '-';
};

const normalizeClassificationLabel = (value: any) => {
  const raw = displayName(value);
  const lower = raw.toString().toLowerCase();
  if (raw === '-' || raw.trim() === '') return 'Unclassified';
  if (['asset', 'assets'].includes(lower)) return 'Asset';
  if (['non-asset', 'non asset', 'nonasset'].includes(lower)) return 'Non-Asset';
  return raw;
};

const formatDate = (value?: string | null) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-GB');
};

const autoFitColumns = (worksheet: ExcelJS.Worksheet, minWidth = 12, maxWidth = 40) => {
  worksheet.columns?.forEach(column => {
    let maxLength = minWidth;
    column.eachCell?.({ includeEmpty: true }, cell => {
      const cellValue = cell.value === null || cell.value === undefined ? '' : cell.value;
      const text = typeof cellValue === 'object' ? JSON.stringify(cellValue) : String(cellValue);
      maxLength = Math.max(maxLength, text.length + 2);
    });
    column.width = Math.min(maxLength, maxWidth);
  });
};

const applyTableBorders = (worksheet: ExcelJS.Worksheet, startRow: number, endRow: number, startCol: number, endCol: number) => {
  for (let r = startRow; r <= endRow; r++) {
    const row = worksheet.getRow(r);
    for (let c = startCol; c <= endCol; c++) {
      const cell = row.getCell(c);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    }
  }
};

const styleHeaderRow = (row: ExcelJS.Row) => {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
};

async function fetchItAssessmentRecords(): Promise<ItAssessmentRecord[]> {
  const res: any = await authenticatedApi.get('/api/compliance/it-assess');
  const list = Array.isArray(res?.data?.data)
    ? res.data.data
    : Array.isArray(res?.data)
      ? res.data
      : [];
  return list as ItAssessmentRecord[];
}

export async function downloadItAssessmentReport() {
  const records = await fetchItAssessmentRecords();
  const workbook = new ExcelJS.Workbook();

  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.mergeCells(1, 1, 1, 8);
  const titleCell = summarySheet.getCell(1, 1);
  titleCell.value = 'IT Assessment Summary';
  titleCell.font = { bold: true, size: 20, underline: true };
  titleCell.alignment = { horizontal: 'center' };

  summarySheet.mergeCells(2, 1, 2, 8);
  const disclaimerCell = summarySheet.getCell(2, 1);
  disclaimerCell.value = 'This data was exported from ADMS4. Confidential: This information is for the intended recipient only; any unauthorized use, disclosure, or distribution is strictly prohibited and may be unlawful.';
  disclaimerCell.font = { italic: true, color: { argb: 'FF555555' } };
  disclaimerCell.alignment = { horizontal: 'center', wrapText: true };

  let rowCursor = 4;

  const total = records.length;
  const assessed = records.filter(item => item.assessment_date).length;
  const notAssessed = total - assessed;
  const pct = (value: number) => (total === 0 ? 0 : Math.round((value / total) * 1000) / 10);

  summarySheet.getCell(rowCursor, 1).value = 'Overall Summary';
  summarySheet.getCell(rowCursor, 1).font = { bold: true };
  rowCursor += 1;

  const overallHeader = summarySheet.getRow(rowCursor);
  overallHeader.values = ['Metric', 'Value'];
  styleHeaderRow(overallHeader);
  rowCursor += 1;
  summarySheet.addRow(['Total Assets', total]);
  summarySheet.addRow(['Assessed', `${assessed} (${pct(assessed)}%)`]);
  summarySheet.addRow(['Not Assessed', `${notAssessed} (${pct(notAssessed)}%)`]);
  const overallStart = overallHeader.number;
  const overallEnd = overallStart + 3;
  applyTableBorders(summarySheet, overallStart, overallEnd, 1, 2);
  rowCursor += 3;

  summarySheet.getCell(rowCursor, 1).value = 'Classification Breakdown';
  summarySheet.getCell(rowCursor, 1).font = { bold: true };
  rowCursor += 1;

  const classificationHeader = summarySheet.getRow(rowCursor);
  classificationHeader.values = ['Classification', 'Total', 'Assessed', 'Not Assessed', 'Assessed %', 'Not Assessed %'];
  styleHeaderRow(classificationHeader);
  rowCursor += 1;

  const classificationMap = new Map<string, { assessed: number; total: number }>();
  records.forEach(row => {
    const label = normalizeClassificationLabel(row.asset_status);
    const entry = classificationMap.get(label) ?? { assessed: 0, total: 0 };
    entry.total += 1;
    if (row.assessment_date) entry.assessed += 1;
    classificationMap.set(label, entry);
  });
  const classificationRows = Array.from(classificationMap.entries()).sort((a, b) => b[1].total - a[1].total);
  classificationRows.forEach(([label, counts]) => {
    const notAssessedCount = counts.total - counts.assessed;
    const rowPct = (value: number) => (counts.total === 0 ? 0 : Math.round((value / counts.total) * 1000) / 10);
    summarySheet.addRow([
      label,
      counts.total,
      counts.assessed,
      notAssessedCount,
      rowPct(counts.assessed),
      rowPct(notAssessedCount),
    ]);
  });
  const classificationStart = classificationHeader.number;
  const classificationEnd = classificationStart + classificationRows.length;
  applyTableBorders(summarySheet, classificationStart, classificationEnd, 1, 6);
  rowCursor += classificationRows.length + 2;

  summarySheet.getCell(rowCursor, 1).value = 'Category Breakdown';
  summarySheet.getCell(rowCursor, 1).font = { bold: true };
  rowCursor += 1;

  const categoryHeader = summarySheet.getRow(rowCursor);
  categoryHeader.values = ['Category', 'Total', 'Assessed', 'Not Assessed', 'Assessed %', 'Not Assessed %'];
  styleHeaderRow(categoryHeader);
  rowCursor += 1;

  const categoryMap = new Map<string, { assessed: number; total: number }>();
  records.forEach(row => {
    const label = displayName(row.category);
    const entry = categoryMap.get(label) ?? { assessed: 0, total: 0 };
    entry.total += 1;
    if (row.assessment_date) entry.assessed += 1;
    categoryMap.set(label, entry);
  });
  const categoryRows = Array.from(categoryMap.entries()).sort((a, b) => b[1].total - a[1].total);
  categoryRows.forEach(([label, counts]) => {
    const notAssessedCount = counts.total - counts.assessed;
    const rowPct = (value: number) => (counts.total === 0 ? 0 : Math.round((value / counts.total) * 1000) / 10);
    summarySheet.addRow([
      label,
      counts.total,
      counts.assessed,
      notAssessedCount,
      rowPct(counts.assessed),
      rowPct(notAssessedCount),
    ]);
  });
  const categoryStart = categoryHeader.number;
  const categoryEnd = categoryStart + categoryRows.length;
  applyTableBorders(summarySheet, categoryStart, categoryEnd, 1, 6);

  autoFitColumns(summarySheet, 12, 32);

  const recordSheet = workbook.addWorksheet('Records');
  const headers = [
    'No',
    'Assessment ID',
    'Assessment Year',
    'Assessment Date',
    'Technician',
    'Technician Name',
    'Overall Score',
    'Remarks',
    'Asset ID',
    'Register Number',
    'Category',
    'Brand',
    'Model',
    'Purchase Date',
    'OS Name',
    'OS Version',
    'OS Patch Status',
    'CPU Manufacturer',
    'CPU Model',
    'CPU Generation',
    'Memory Manufacturer',
    'Memory Type',
    'Memory Size (GB)',
    'Storage Manufacturer',
    'Storage Type',
    'Storage Size (GB)',
    'Graphics Type',
    'Graphics Manufacturer',
    'Graphics Specs',
    'Display Manufacturer',
    'Display Size',
    'Display Resolution',
    'Display Form Factor',
    'Display Interfaces',
    'Ports USB-A',
    'Ports USB-C',
    'Ports Thunderbolt',
    'Ports Ethernet',
    'Ports HDMI',
    'Ports DisplayPort',
    'Ports VGA',
    'Ports SD Card',
    'Ports Audio Jack',
    'Battery Equipped',
    'Battery Capacity',
    'Adapter Equipped',
    'Adapter Output',
    'AV Installed',
    'AV Vendor',
    'AV Status',
    'AV License',
    'VPN Installed',
    'VPN Setup Type',
    'VPN Username',
    'Installed Software',
    'Office Account',
    'Attachment 1',
    'Attachment 2',
    'Attachment 3',
    'Asset Status',
    'Created At',
    'Updated At',
    'Location',
    'Department',
    'Cost Center',
    'Employee Name',
    'Employee Ramco ID',
  ];

  recordSheet.mergeCells(1, 1, 1, headers.length);
  const recordTitle = recordSheet.getCell(1, 1);
  recordTitle.value = 'IT Assessment Records';
  recordTitle.font = { bold: true, size: 20, underline: true };
  recordTitle.alignment = { horizontal: 'center' };

  recordSheet.addRow([]);
  const headerRow = recordSheet.addRow(headers);
  styleHeaderRow(headerRow);

  if (!records.length) {
    recordSheet.addRow(['No data available']);
  } else {
    records.forEach((row, index) => {
      recordSheet.addRow([
        index + 1,
        row.id ?? '',
        row.assessment_year ?? '',
        formatDate(row.assessment_date),
        row.technician || '',
        row.technician_name || '',
        row.overall_score ?? '',
        row.remarks || '',
        row.asset_id ?? '',
        row.register_number || '',
        displayName(row.category),
        displayName(row.brand),
        displayName(row.model),
        formatDate(row.purchase_date),
        row.os_name || '',
        row.os_version || '',
        row.os_patch_status || '',
        row.cpu_manufacturer || '',
        row.cpu_model || '',
        row.cpu_generation || '',
        row.memory_manufacturer || '',
        row.memory_type || '',
        row.memory_size_gb ?? '',
        row.storage_manufacturer || '',
        row.storage_type || '',
        row.storage_size_gb ?? '',
        row.graphics_type || '',
        row.graphics_manufacturer || '',
        row.graphics_specs || '',
        row.display_manufacturer || '',
        row.display_size || '',
        row.display_resolution || '',
        row.display_form_factor || '',
        (row.display_interfaces || []).join(', '),
        row.ports_usb_a ?? '',
        row.ports_usb_c ?? '',
        row.ports_thunderbolt ?? '',
        row.ports_ethernet ?? '',
        row.ports_hdmi ?? '',
        row.ports_displayport ?? '',
        row.ports_vga ?? '',
        row.ports_sdcard ?? '',
        row.ports_audiojack ?? '',
        row.battery_equipped ?? '',
        row.battery_capacity || '',
        row.adapter_equipped ?? '',
        row.adapter_output || '',
        row.av_installed || '',
        row.av_vendor || '',
        row.av_status || '',
        row.av_license || '',
        row.vpn_installed || '',
        row.vpn_setup_type || '',
        row.vpn_username || '',
        (row.installed_software || []).join(', '),
        row.office_account || '',
        row.attachment_1 || '',
        row.attachment_2 || '',
        row.attachment_3 || '',
        row.asset_status || '',
        formatDate(row.created_at),
        formatDate(row.updated_at),
        displayName(row.location),
        displayName(row.department),
        displayName(row.costcenter),
        displayName(typeof row.employee === 'object' ? row.employee?.full_name : row.employee),
        displayName(typeof row.employee === 'object' ? row.employee?.ramco_id : ''),
      ]);
    });
  }

  const startRow = headerRow.number;
  const endRow = recordSheet.lastRow?.number || startRow;
  applyTableBorders(recordSheet, startRow, endRow, 1, headers.length);
  autoFitColumns(recordSheet, 10, 32);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const now = new Date();
  const pad = (v: number) => v.toString().padStart(2, '0');
  const timestamp = `${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const link = document.createElement('a');
  link.href = url;
  link.download = `excel-itassess-report-${timestamp}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

const ExcelItAssessReportButton: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      await downloadItAssessmentReport();
      toast.success('IT assessment report exported');
    } catch (error) {
      console.error('Error downloading IT assessment report', error);
      toast.error('Failed to export IT assessment report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      className="gap-2 border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white"
      onClick={handleDownload}
      disabled={loading}
    >
      {loading ? <Loader2 size={16} className="mr-1 animate-spin" /> : <FileSpreadsheet size={16} className="mr-1" />}
      Export Excel
    </Button>
  );
};

export default ExcelItAssessReportButton;
