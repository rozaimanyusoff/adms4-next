'use client';

import React, { useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import ExcelJS from 'exceljs';
import { toast } from 'sonner';

type PoolcarRequest = {
  pcar_id?: number | string;
  pcar_datereq?: string;
  pcar_empid?: { full_name?: string; ramco_id?: string };
  department?: { code?: string } | string;
  dept_id?: string | number;
  location?: { name?: string } | string;
  loc_id?: string | number;
  pcar_type?: string | number;
  pcar_datefr?: string;
  pcar_dateto?: string;
  pcar_day?: number | string;
  pcar_hour?: number | string;
  pcar_dest?: string;
  assigned_poolcar?: { register_number?: string };
  asset?: { register_number?: string };
  vehicle_id?: string | number;
  approval_stat?: number | string | null;
  approval_date?: string | null;
  status?: string | null;
  pcar_retdate?: string | null;
  pcar_rettime?: string | null;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.toLocaleDateString('en-GB')} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
};

const formatDate = (value?: string | null) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-GB');
};

const autoFitColumns = (sheet: ExcelJS.Worksheet, minWidth = 10, maxWidth = 40) => {
  sheet.columns?.forEach((col) => {
    let max = minWidth;
    col.eachCell?.({ includeEmpty: true }, (cell) => {
      const val = cell.value;
      const txt = val === null || val === undefined ? '' : typeof val === 'object' ? JSON.stringify(val) : String(val);
      max = Math.max(max, txt.length + 2);
    });
    col.width = Math.min(max, maxWidth);
  });
};

async function fetchPoolcarRequests(): Promise<PoolcarRequest[]> {
  const res = await authenticatedApi.get('/api/mtn/poolcars');
  const payload = res?.data as any;
  const list: any[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.result)
          ? payload.result
          : [];
  return list as PoolcarRequest[];
}

export async function downloadPoolcarRequestReport() {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, idx) => currentYear - idx);
  const allData = await fetchPoolcarRequests();
  const yearBuckets: Record<number, PoolcarRequest[]> = {};
  years.forEach(y => { yearBuckets[y] = []; });
  allData.forEach(item => {
    const dateStr = item.pcar_datereq || item.pcar_datefr || item.pcar_dateto || '';
    const d = dateStr ? new Date(dateStr) : null;
    const year = d && !Number.isNaN(d.getTime()) ? d.getFullYear() : null;
    if (year !== null && yearBuckets[year]) {
      yearBuckets[year].push(item);
    }
  });

  const workbook = new ExcelJS.Workbook();
  const summary = workbook.addWorksheet('Summary');
  summary.mergeCells(1, 1, 1, 17);
  const summaryTitle = summary.getCell(1, 1);
  summaryTitle.value = 'Poolcar Request Summary';
  summaryTitle.font = { bold: true, size: 20, underline: true };
  summaryTitle.alignment = { horizontal: 'center' };
  summary.mergeCells(2, 1, 2, 17);
  const summaryDisclaimer = summary.getCell(2, 1);
  summaryDisclaimer.value = 'This data was exported from ADMS4. Confidential: This information is for the intended recipient only; any unauthorized use, disclosure, or distribution is strictly prohibited and may be unlawful.';
  summaryDisclaimer.font = { italic: true, color: { argb: 'FF555555' } };
  summaryDisclaimer.alignment = { horizontal: 'center', wrapText: true };
  summary.addRow([]);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const summaryHeaders = ['Year', 'Total Request', 'Total Cancelled', 'Total Approved', 'Total Rejected', ...monthNames];
  const summaryHeaderRow = summary.addRow(summaryHeaders);
  summaryHeaderRow.font = { bold: true };
  summaryHeaderRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9EAF7' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  const normalizeStatus = (value?: string | null) => (value || '').toLowerCase().trim();
  years.forEach(year => {
    const list = yearBuckets[year] || [];
    const total = list.length;
    const cancelled = list.filter(r => normalizeStatus(r.status).includes('cancel')).length;
    const approved = list.filter(r => normalizeStatus(r.status).includes('approve')).length;
    const rejected = list.filter(r => normalizeStatus(r.status).includes('reject')).length;
    const monthTotals = new Array(12).fill(0);
    list.forEach(r => {
      const dateStr = r.pcar_datereq || r.pcar_datefr || r.pcar_dateto;
      if (!dateStr) return;
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return;
      monthTotals[d.getMonth()] += 1;
    });
    const row = summary.addRow([year, total, cancelled, approved, rejected, ...monthTotals]);
    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });

  autoFitColumns(summary, 10, 20);

  const sheet = workbook.addWorksheet('Poolcar Requests');
  const headers = [
    'No',
    'Request ID',
    'Request Date',
    'Employee',
    'Department',
    'Location',
    'Type',
    'From',
    'To',
    'Duration (d h)',
    'Return At',
    'Destination',
    'Vehicle',
    'Approval Status',
    'Approval Date',
    'Status',
  ];

  sheet.mergeCells(1, 1, 1, headers.length);
  const title = sheet.getCell(1, 1);
  title.value = 'Poolcar Request Report';
  title.font = { bold: true, size: 20 };
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

  const data = allData;
  data.forEach((item, idx) => {
    const vehicle = item.assigned_poolcar?.register_number || item.asset?.register_number || (item.vehicle_id ? String(item.vehicle_id) : '');
    const dept = typeof item.department === 'object' ? item.department?.code : item.department || item.dept_id || '';
    const loc = typeof item.location === 'object' ? item.location?.name : item.location || item.loc_id || '';
    const approvalStatus = item.approval_stat ?? '';
    const row = sheet.addRow([
      idx + 1,
      item.pcar_id ?? '',
      formatDate(item.pcar_datereq),
      item.pcar_empid?.full_name || item.pcar_empid?.ramco_id || '',
      dept,
      loc,
      item.pcar_type ?? '',
      formatDateTime(item.pcar_datefr),
      formatDateTime(item.pcar_dateto),
      `${item.pcar_day ?? 0}d ${item.pcar_hour ?? 0}h`,
      item.pcar_retdate || item.pcar_rettime ? `${formatDate(item.pcar_retdate)} ${item.pcar_rettime ?? ''}`.trim() : '',
      item.pcar_dest || '',
      vehicle,
      approvalStatus,
      formatDate(item.approval_date ?? null),
      item.status ?? '',
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

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const now = new Date();
  const pad = (v: number) => v.toString().padStart(2, '0');
  const filename = `excel-poolcarrequest-${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.xlsx`;
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

const PoolcarRequestExcelButton: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      await downloadPoolcarRequestReport();
      toast.success('Poolcar request report exported');
    } catch (error) {
      console.error('Error downloading poolcar request report', error);
      toast.error('Failed to export poolcar request report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="default"
      className="bg-green-600 hover:bg-green-700 text-white"
      size="sm"
      onClick={handleDownload}
      disabled={loading}
    >
      {loading ? <Loader2 size={14} className="mr-2 animate-spin" /> : <FileSpreadsheet size={14} className="mr-2" />}
      Export Excel
    </Button>
  );
};

export default PoolcarRequestExcelButton;
