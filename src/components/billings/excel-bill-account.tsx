'use client';

import React, { useState } from 'react';
import ExcelJS from 'exceljs';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

interface BillingAccountRow {
  bill_id?: number;
  account?: string;
  category?: string;
  description?: string;
  status?: string;
  contract_start?: string;
  contract_end?: string;
  deposit?: string;
  rental?: string;
  beneficiary?: { name?: string | null } | null;
  costcenter?: { name?: string | null } | null;
  location?: { name?: string | null } | null;
}

interface ExcelBillAccountProps {
  rows: BillingAccountRow[];
}

const pad = (n: number) => n.toString().padStart(2, '0');

const formatDate = (value?: string | null) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-GB');
};

const applyBorder = (cell: ExcelJS.Cell) => {
  cell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };
};

const ExcelBillAccount: React.FC<ExcelBillAccountProps> = ({ rows }) => {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!rows.length) {
      toast.error('No billing accounts to export');
      return;
    }

    setLoading(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Billing Accounts');

      sheet.columns = [
        { header: 'No', key: 'no', width: 8 },
        { header: 'Account No', key: 'account', width: 22 },
        { header: 'Category', key: 'category', width: 16 },
        { header: 'Beneficiary', key: 'beneficiary', width: 28 },
        { header: 'Description', key: 'description', width: 34 },
        { header: 'Cost Center', key: 'costcenter', width: 22 },
        { header: 'Location', key: 'location', width: 22 },
        { header: 'Deposit', key: 'deposit', width: 14 },
        { header: 'Monthly/Rental', key: 'rental', width: 16 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'Contract Start', key: 'contract_start', width: 16 },
        { header: 'Contract End', key: 'contract_end', width: 16 },
      ];

      const titleRow = sheet.addRow(['Utility Billing Accounts Export']);
      titleRow.font = { bold: true, size: 14 };
      titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.mergeCells(titleRow.number, 1, titleRow.number, sheet.columns.length);
      sheet.addRow([]);

      const headerRow = sheet.addRow(sheet.columns.map((column) => column.header));
      headerRow.height = 20;
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        applyBorder(cell);
      });

      rows.forEach((row, index) => {
        sheet.addRow({
          no: index + 1,
          account: row.account ?? '',
          category: row.category ?? '',
          beneficiary: row.beneficiary?.name ?? '',
          description: row.description ?? '',
          costcenter: row.costcenter?.name ?? '',
          location: row.location?.name ?? '',
          deposit: row.deposit ?? '',
          rental: row.rental ?? '',
          status: row.status ?? '',
          contract_start: formatDate(row.contract_start),
          contract_end: formatDate(row.contract_end),
        });
      });

      for (let rowNumber = headerRow.number + 1; rowNumber <= (sheet.lastRow?.number ?? headerRow.number); rowNumber += 1) {
        const row = sheet.getRow(rowNumber);
        row.eachCell((cell) => {
          cell.alignment = { vertical: 'middle' };
          applyBorder(cell);
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const now = new Date();
      link.href = url;
      link.download = `excel-billing-accounts-${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Billing accounts exported');
    } catch (error) {
      console.error('Failed to export billing accounts', error);
      toast.error('Failed to export billing accounts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      className="gap-2 border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white"
      onClick={handleExport}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
      <span>Excel</span>
    </Button>
  );
};

export default ExcelBillAccount;
