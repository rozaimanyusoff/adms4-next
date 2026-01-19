'use client';

import React, { useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import ExcelJS from 'exceljs';
import { toast } from 'sonner';

type AssessmentInfo = {
  assessment_year?: number;
  id?: number;
};

type PcAsset = {
  id?: number;
  register_number?: string | null;
  classification?: string | null;
  category?: { id?: number; name?: string } | string | null;
  location?: { id?: number; name?: string; code?: string } | string | null;
  department?: { id?: number; name?: string; code?: string } | string | null;
  costcenter?: { id?: number; name?: string } | string | null;
  owner?: { id?: number; full_name?: string; name?: string; ramco_id?: string } | string | null;
  brand?: { id?: number; name?: string } | string | null;
  model?: { id?: number; name?: string } | string | null;
  type?: { id?: number; name?: string } | string | null;
  purchase_date?: string | null;
  purchase_year?: number | null;
  record_status?: string | null;
};

type PcAssessmentRow = PcAsset & {
  assessed?: boolean;
  assessment_count?: number;
  assessments?: AssessmentInfo[];
  last_assessment?: AssessmentInfo | null;
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

async function fetchItAssessmentRecords(): Promise<PcAssessmentRow[]> {
  const res: any = await authenticatedApi.get('/api/compliance/it-assets-status');
  const list = Array.isArray(res?.data?.data)
    ? res.data.data
    : Array.isArray(res?.data)
      ? res.data
      : [];
  return list.map((item: any) => {
    const asset: PcAsset = item?.asset ?? {};
    return {
      ...asset,
      assessed: item?.assessed ?? false,
      assessment_count: item?.assessment_count ?? 0,
      assessments: item?.assessments,
      last_assessment: item?.last_assessment,
    };
  });
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
  const assessed = records.filter(item => item.assessed).length;
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
    const label = normalizeClassificationLabel(row.classification);
    const entry = classificationMap.get(label) ?? { assessed: 0, total: 0 };
    entry.total += 1;
    if (row.assessed) entry.assessed += 1;
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
    if (row.assessed) entry.assessed += 1;
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
    'Register Number',
    'Classification',
    'Category',
    'Type',
    'Brand',
    'Model',
    'Owner',
    'Location',
    'Department',
    'Cost Center',
    'Purchase Date',
    'Purchase Year',
    'Record Status',
    'Assessed',
    'Assessment Count',
    'Last Assessment Year',
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
        row.register_number || '',
        normalizeClassificationLabel(row.classification),
        displayName(row.category),
        displayName(row.type),
        displayName(row.brand),
        displayName(row.model),
        displayName(row.owner),
        displayName(row.location),
        displayName(row.department),
        displayName(row.costcenter),
        formatDate(row.purchase_date),
        row.purchase_year ?? '',
        row.record_status || '',
        row.assessed ? 'Yes' : 'No',
        row.assessment_count ?? 0,
        row.last_assessment?.assessment_year ?? '',
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
