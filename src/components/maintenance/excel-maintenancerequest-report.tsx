'use client';

import React, { useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import ExcelJS from 'exceljs';
import { toast } from 'sonner';

interface ServiceType {
  id: number;
  name: string;
}

interface VehicleRef {
  id: number;
  register_number?: string;
}

interface Requester {
  name?: string;
  email?: string;
}

interface CostCenter {
  name?: string;
}

interface Workshop {
  name?: string;
}

interface MaintenanceRequest {
  req_id?: number;
  req_date?: string | null;
  upload_date?: string | null;
  verification_date?: string | null;
  recommendation_date?: string | null;
  approval_date?: string | null;
  form_upload_date?: string | null;
  req_comment?: string | null;
  status?: string | null;
  svc_type?: ServiceType[];
  vehicle?: VehicleRef;
  asset?: VehicleRef;
  requester?: Requester;
  costcenter?: CostCenter;
  workshop?: Workshop;
}

const formatDate = (value?: string | null) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-GB');
};

const normalizeStatus = (value?: string | null) => (value || '').toString().trim().toUpperCase();

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

async function fetchRequestsByYear(year: number): Promise<MaintenanceRequest[]> {
  const res = await authenticatedApi.get('/api/mtn/request', { params: { year } });
  const data = (res.data as { data?: MaintenanceRequest[] })?.data;
  return Array.isArray(data) ? data : [];
}

export async function downloadMaintenanceRequestReport() {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, idx) => currentYear - idx);
  const headers = [
    'No',
    'Request ID',
    'Request Date',
    'Register Number',
    'Service Types',
    'Requester',
    'Requester Email',
    'Cost Center',
    'Workshop',
    'Status',
    'Upload Date',
    'Verification Date',
    'Recommendation Date',
    'Approval Date',
    'Form Upload Date',
    'Comment',
  ];

  const workbook = new ExcelJS.Workbook();

  // Fetch data upfront for summary + detail sheets
  const yearData: Record<number, MaintenanceRequest[]> = {};
  for (const year of years) {
    yearData[year] = await fetchRequestsByYear(year);
  }

  // Summary sheet
  const summary = workbook.addWorksheet('Summary');
  summary.mergeCells(1, 1, 1, 17);
  const summaryTitle = summary.getCell(1, 1);
  summaryTitle.value = 'Maintenance Request Summary';
  summaryTitle.font = { bold: true, size: 20, underline: true };
  summaryTitle.alignment = { horizontal: 'center' };
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

  const normalize = (status?: string | null) => (status || '').toLowerCase().trim();
  years.forEach(year => {
    const list = yearData[year] || [];
    const total = list.length;
    const cancelled = list.filter(r => normalize(r.status).includes('cancel')).length;
    const approved = list.filter(r => normalize(r.status).includes('approved')).length;
    const rejected = list.filter(r => normalize(r.status).includes('reject')).length;
    const monthTotals = new Array(12).fill(0);
    list.forEach(r => {
      const dateStr = r.req_date || r.approval_date || r.recommendation_date || r.verification_date;
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

  for (const year of years) {
    const worksheet = workbook.addWorksheet(year.toString());
    worksheet.mergeCells(1, 1, 1, headers.length);
    const title = worksheet.getCell(1, 1);
    title.value = `Vehicle Maintenance Request: ${year}`;
    title.font = { bold: true, size: 24, underline: true };
    title.alignment = { horizontal: 'center' };

    worksheet.addRow([]);
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: '000000' } };
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9EAF7' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });

    const requests = yearData[year] || [];
    if (!requests.length) {
      const row = worksheet.addRow(['No data available']);
      row.font = { italic: true };
      autoFitColumns(worksheet);
      continue;
    }

    requests.forEach((req, idx) => {
      const registerNumber = req.asset?.register_number || req.vehicle?.register_number || '';
      const serviceTypes = (req.svc_type || []).map(st => st.name).filter(Boolean).join(', ');
      worksheet.addRow([
        idx + 1,
        req.req_id ?? '',
        formatDate(req.req_date),
        registerNumber,
        serviceTypes,
        req.requester?.name || '',
        req.requester?.email || '',
        req.costcenter?.name || '',
        req.workshop?.name || '',
        normalizeStatus(req.status),
        formatDate(req.upload_date),
        formatDate(req.verification_date),
        formatDate(req.recommendation_date),
        formatDate(req.approval_date),
        formatDate(req.form_upload_date),
        req.req_comment || '',
      ]);
    });

    // Apply thin borders to the header + data region
    const startRow = headerRow.number;
    const endRow = worksheet.lastRow?.number || startRow;
    const startCol = 1;
    const endCol = headers.length;
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

    autoFitColumns(worksheet);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const now = new Date();
  const pad = (v: number) => v.toString().padStart(2, '0');
  const timestamp = `${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const link = document.createElement('a');
  link.href = url;
  link.download = `excel-maintenancerequest-${timestamp}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

const MaintenanceRequestExcelButton: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      await downloadMaintenanceRequestReport();
      toast.success('Maintenance request report exported');
    } catch (error) {
      console.error('Error downloading maintenance request report', error);
      toast.error('Failed to export maintenance request report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="default"
      className="bg-green-600 hover:bg-green-700 text-white"
      onClick={handleDownload}
      disabled={loading}
    >
      {loading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <FileSpreadsheet size={16} className="mr-2" />}
      Export Excel
    </Button>
  );
};

export default MaintenanceRequestExcelButton;
