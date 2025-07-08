import React, { useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ExcelJS from 'exceljs';

const maintenanceTypes = [
  { value: 'service', label: 'Service' },
  { value: 'fuel', label: 'Fuel Consumption' },
];

const reportTypes = [
  { value: 'summary', label: 'Summary' },
  { value: 'monthly', label: 'Monthly' },
];

const VehicleMtnReport = () => {
  const [maintenanceType, setMaintenanceType] = useState('service');
  const [reportType, setReportType] = useState('summary');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  // Calculate last day of previous month in local time (not UTC)
  const today = new Date();
  const lastDayPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const maxDate = `${lastDayPrevMonth.getFullYear()}-${pad(lastDayPrevMonth.getMonth() + 1)}-${pad(lastDayPrevMonth.getDate())}`;

  const handleDownload = async () => {
    setLoading(true);
    try {
      if (maintenanceType === 'fuel' && reportType === 'monthly') {
        try {
          type Detail = {
            asset?: { register_number?: string };
            amount?: string;
          };
          type Item = {
            stmt_date: string;
            details?: Detail[];
          };
          type ApiResponse = {
            status: string;
            message: string;
            data: Item[];
          };
          const res = await authenticatedApi.get(`/api/bills/fuel/filter?from=${startDate}&to=${endDate}`);
          const json = res.data as ApiResponse;
          if (json.status === 'success' && Array.isArray(json.data)) {
            const allDetails = json.data.flatMap((item: any) =>
              (item.details || []).map((detail: any, idx: number) => ({
                No: idx + 1,
                stmt_id: item.stmt_id || '',
                stmt_no: item.stmt_no || '',
                fleetcard_no: detail.fleetcard?.fc_no || '',
                fleetcard_issuer: detail.fleetcard?.issuer || '',
                register_number: detail.asset?.register_number || '',
                costcenter: detail.costcenter?.name || '',
                district: detail.district?.code || '',
                amount: detail.amount !== undefined && detail.amount !== null ? Number(detail.amount) : 0,
                stmt_date: item.stmt_date
              }))
            );
            if (allDetails.length === 0) {
              alert('No data found for the selected period.');
              setLoading(false);
              return;
            }
            // Get month and year from first stmt_date
            const date = new Date(allDetails[0].stmt_date);
            const title = `Fuel Consumption Report: ${date.toLocaleString('default', { month: 'long', year: 'numeric' })}`;
            // Calculate summary values from all parent items
            const subtotal = json.data.reduce((sum: any, item: any) => sum + (parseFloat(item.stmt_stotal) || 0), 0);
            const discount = json.data.reduce((sum: any, item: any) => sum + (parseFloat(item.stmt_disc) || 0), 0);
            const billingTotal = json.data.reduce((sum: any, item: any) => sum + (parseFloat(item.stmt_total) || 0), 0);
            // Create workbook and worksheet
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Report');
            // Add title
            worksheet.addRow([title]);
            worksheet.addRow([`Subtotal amount: ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);
            worksheet.addRow([`Discount: ${discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);
            worksheet.addRow([`Billing Total: ${billingTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);
            worksheet.addRow([]); // Empty row
            worksheet.addRow(['No', 'Statement ID', 'Statement No', 'Fleet Card No', 'Fleet Card Issuer', 'Register Number', 'Costcenter', 'District', 'Amount']);
            const tableStartRow = worksheet.lastRow ? worksheet.lastRow.number : 6;
            allDetails.forEach((row: any) => {
              worksheet.addRow([
                row.No,
                row.stmt_id,
                row.stmt_no,
                row.fleetcard_no,
                row.fleetcard_issuer,
                row.register_number,
                row.costcenter,
                row.district,
                row.amount
              ]);
            });
            // Calculate total
            const totalAmount = allDetails.reduce((sum: number, row: any) => sum + (parseFloat(row.amount) || 0), 0);
            worksheet.addRow(['', '', '', '', '', '', '', 'Total', totalAmount.toFixed(2)]);
            // Add borders to table (header, data, total)
            const tableEndRow = worksheet.lastRow ? worksheet.lastRow.number : tableStartRow;
            for (let rowNum = tableStartRow; rowNum <= tableEndRow; rowNum++) {
              const row = worksheet.getRow(rowNum);
              row.eachCell(cell => {
                cell.border = {
                  top: { style: 'thin' },
                  left: { style: 'thin' },
                  bottom: { style: 'thin' },
                  right: { style: 'thin' }
                };
              });
            }
            worksheet.getRow(1).font = { bold: true, size: 14 };
            worksheet.getRow(tableStartRow).font = { bold: true };
            if (worksheet.lastRow) {
              worksheet.lastRow.font = { bold: true };
            }
            // Auto width
            worksheet.columns.forEach(col => {
              let maxLength = 10;
              col.eachCell?.({ includeEmpty: true }, cell => {
                maxLength = Math.max(maxLength, (cell.value ? cell.value.toString().length : 0));
              });
              col.width = maxLength + 2;
            });
            // Download
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            // Build filename with month and datetime (no dashes)
            const monthYearStr = date.toLocaleString('default', { month: 'short', year: 'numeric' }).replace(' ', ''); // e.g. May2025
            const now = new Date();
            const datetimeStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}T${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
            const filename = `fuel-monthly-${monthYearStr}-${datetimeStr}.xlsx`;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          } else {
            alert('Failed to fetch data.');
          }
        } catch (err) {
          alert('Error downloading report.');
        } finally {
          setLoading(false);
        }
        return;
      }
      if (maintenanceType === 'fuel' && reportType === 'summary') {
        try {
          const res = await authenticatedApi.get(`/api/bills/fuel/summary?from=${startDate}&to=${endDate}`);
          const json = res.data as any;
          if (json.status === 'success' && Array.isArray(json.data)) {
            // Enhanced summary: collect all years and months per year
            const yearMonthMap: Record<string, string[]> = {};
            json.data.forEach((item: any) => {
              (item.details || []).forEach((detail: any) => {
                const year = detail.year?.toString();
                if (year && Array.isArray(detail.fuel)) {
                  if (!yearMonthMap[year]) yearMonthMap[year] = [];
                  detail.fuel.forEach((fuel: any) => {
                    if (fuel.stmt_date) {
                      const d = new Date(fuel.stmt_date);
                      const month = d.toLocaleString('default', { month: 'long' });
                      const key = `${year}-${month}`;
                      if (!yearMonthMap[year].includes(month)) yearMonthMap[year].push(month);
                    }
                  });
                }
              });
            });
            // Sort years and months
            const years = Object.keys(yearMonthMap).sort();
            years.forEach(y => {
              yearMonthMap[y].sort((a, b) => {
                const da = new Date(`${a} 1, ${y}`);
                const db = new Date(`${b} 1, ${y}`);
                return da.getTime() - db.getTime();
              });
            });
            // Build flat list of columns: [{year, month}]
            const columns: { year: string, month: string }[] = [];
            years.forEach(y => {
              yearMonthMap[y].forEach(m => {
                columns.push({ year: y, month: m });
              });
            });
            // Build rows: group by asset/costcenter/district
            const rows: Record<string, any> = {};
            json.data.forEach((item: any) => {
              const key = `${item.asset?.register_number}|${item.costcenter?.name}|${item.district?.code}`;
              if (!rows[key]) {
                rows[key] = {
                  register_number: item.asset?.register_number || '',
                  costcenter: item.costcenter?.name || '',
                  district: item.district?.code || '',
                  amounts: {} as Record<string, string>
                };
              }
              (item.details || []).forEach((detail: any) => {
                const year = detail.year?.toString();
                if (year && Array.isArray(detail.fuel)) {
                  detail.fuel.forEach((fuel: any) => {
                    if (fuel.stmt_date) {
                      const d = new Date(fuel.stmt_date);
                      const month = d.toLocaleString('default', { month: 'long' });
                      const colKey = `${year}-${month}`;
                      rows[key].amounts[colKey] = fuel.amount || '';
                    }
                  });
                }
              });
            });
            // Prepare worksheet
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Summary');
            worksheet.addRow(['Fuel Consumption Summary Report']);
            worksheet.addRow([]);
            // Two-level header: years (merged), months, and Sub-total
            const header1 = ['No', 'Register Number', 'Costcenter', 'District'];
            const header2 = ['', '', '', ''];
            years.forEach(y => {
              const months = yearMonthMap[y];
              header1.push(y);
              for (let i = 1; i < months.length; i++) header1.push('');
              months.forEach(m => header2.push(m));
            });
            header1.push('Sub-total');
            header2.push('');
            worksheet.addRow(header1);
            worksheet.addRow(header2);
            // Merge year cells
            let col = 5;
            years.forEach(y => {
              const months = yearMonthMap[y];
              if (months.length > 1) {
                worksheet.mergeCells(3, col, 3, col + months.length - 1);
              }
              col += months.length;
            });
            // Merge Sub-total cell (column header)
            worksheet.mergeCells(3, col, 3, col);
            // Row span for first 4 columns (No, Register Number, Costcenter, District)
            for (let i = 1; i <= 4; i++) {
              worksheet.mergeCells(3, i, 4, i);
            }
            // Add data rows
            const tableStartRow = worksheet.lastRow ? worksheet.lastRow.number + 1 : 5;
            let no = 1;
            Object.values(rows).forEach((row: any) => {
              const amounts = columns.map(c => {
                const val = row.amounts[`${c.year}-${c.month}`];
                return val !== undefined && val !== '' ? Number(val) : 0;
              });
              const subTotal = amounts.reduce((a, b) => (a || 0) + (b || 0), 0);
              worksheet.addRow([
                no++,
                row.register_number,
                row.costcenter,
                row.district,
                ...amounts,
                subTotal
              ]);
            });
            // Set number format for amount columns and Sub-total
            const amountStartCol = 5;
            const amountEndCol = amountStartCol + columns.length;
            const lastRowNum = worksheet.lastRow ? worksheet.lastRow.number : tableStartRow;
            for (let rowNum = tableStartRow; rowNum <= lastRowNum; rowNum++) {
              for (let colIdx = amountStartCol; colIdx <= amountEndCol; colIdx++) {
                const cell = worksheet.getRow(rowNum).getCell(colIdx);
                cell.numFmt = '#,##0.00';
              }
            }
            // Add borders
            const tableEndRow = worksheet.lastRow ? worksheet.lastRow.number : tableStartRow;
            for (let rowNum = 3; rowNum <= tableEndRow; rowNum++) {
              const row = worksheet.getRow(rowNum);
              row.eachCell(cell => {
                cell.border = {
                  top: { style: 'thin' },
                  left: { style: 'thin' },
                  bottom: { style: 'thin' },
                  right: { style: 'thin' }
                };
              });
            }
            worksheet.getRow(1).font = { bold: true, size: 14 };
            worksheet.getRow(3).font = { bold: true };
            worksheet.getRow(4).font = { bold: true };
            // Auto width
            worksheet.columns.forEach(col => {
              let maxLength = 10;
              col.eachCell?.({ includeEmpty: true }, cell => {
                maxLength = Math.max(maxLength, (cell.value ? cell.value.toString().length : 0));
              });
              col.width = maxLength + 2;
            });
            // Download
            const now = new Date();
            const datetimeStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}T${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `fuel-summary-${datetimeStr}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          } else {
            alert('Failed to fetch data.');
          }
        } catch (err) {
          alert('Error downloading summary report.');
        } finally {
          setLoading(false);
        }
        return;
      }
      if (maintenanceType === 'service' && reportType === 'summary') {
        setLoading(true);
        try {
          const res = await authenticatedApi.get(`/api/bills/vehicle/summary?from=${startDate}&to=${endDate}`);
          const json = res.data as any;
          if (json.status === 'success' && Array.isArray(json.data)) {
            // 1. Collect all years and months per year
            const yearMonthMap: Record<string, number[]> = {};
            json.data.forEach((item: any) => {
              (item.details || []).forEach((detail: any) => {
                const year = detail.year?.toString();
                if (year && Array.isArray(detail.maintenance)) {
                  if (!yearMonthMap[year]) yearMonthMap[year] = [];
                  detail.maintenance.forEach((mnt: any) => {
                    const month = mnt.month;
                    if (!yearMonthMap[year].includes(month)) yearMonthMap[year].push(month);
                  });
                }
              });
            });
            // Sort years and months
            const years = Object.keys(yearMonthMap).sort();
            years.forEach(y => {
              yearMonthMap[y].sort((a, b) => a - b);
            });
            // Build flat list of columns: [{year, month}]
            const columns: { year: string, month: number }[] = [];
            years.forEach(y => {
              yearMonthMap[y].forEach(m => {
                columns.push({ year: y, month: m });
              });
            });
            // 2. Build rows: group by asset/costcenter/district
            const rows: Record<string, any> = {};
            json.data.forEach((item: any) => {
              const key = `${item.register_number}|${item.costcenter?.name}|${item.district?.code}`;
              if (!rows[key]) {
                rows[key] = {
                  register_number: item.register_number || '',
                  costcenter: item.costcenter?.name || '',
                  district: item.district?.code || '',
                  maintenance: {} as Record<string, { total_maintenance: number, amount: number }>
                };
              }
              (item.details || []).forEach((detail: any) => {
                const year = detail.year?.toString();
                if (year && Array.isArray(detail.maintenance)) {
                  detail.maintenance.forEach((mnt: any) => {
                    const colKey = `${year}-${mnt.month}`;
                    rows[key].maintenance[colKey] = {
                      total_maintenance: mnt.total_maintenance || 0,
                      amount: mnt.amount || 0
                    };
                  });
                }
              });
            });
            // 3. Prepare worksheet
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Service Summary');
            worksheet.addRow(['Service Maintenance Summary Report']);
            worksheet.addRow([]);
            // Two-level header: years (merged), months (each month has 1 column for amount), and Sub-total
            const header1 = ['No', 'Register Number', 'Costcenter', 'District'];
            const header2 = ['', '', '', ''];
            years.forEach(y => {
              const months = yearMonthMap[y];
              months.forEach(() => {
                header1.push(y);
              });
            });
            header1.push('Sub-total');
            years.forEach(y => {
              const months = yearMonthMap[y];
              months.forEach(m => {
                const monthName = new Date(Number(y), m - 1, 1).toLocaleString('default', { month: 'short' });
                header2.push(monthName);
              });
            });
            header2.push('Amount');
            worksheet.addRow(header1);
            worksheet.addRow(header2);
            // Merge year cells
            let col = 5;
            years.forEach(y => {
              const months = yearMonthMap[y];
              if (months.length > 0) {
                worksheet.mergeCells(3, col, 3, col + months.length - 1);
              }
              col += months.length;
            });
            // Merge Sub-total cell
            worksheet.mergeCells(3, col, 4, col);
            // Row span for first 4 columns
            for (let i = 1; i <= 4; i++) {
              worksheet.mergeCells(3, i, 4, i);
            }
            // Add data rows
            const tableStartRow = worksheet.lastRow ? worksheet.lastRow.number + 1 : 5;
            let no = 1;
            Object.values(rows).forEach((row: any) => {
              const maintData = columns.map(c => row.maintenance[`${c.year}-${c.month}`] || { amount: 0 });
              const totalAmount = maintData.reduce((a, b) => a + (b.amount || 0), 0);
              worksheet.addRow([
                no++,
                row.register_number,
                row.costcenter,
                row.district,
                ...maintData.map(md => md.amount),
                totalAmount
              ]);
            });
            // Set number format for amount columns and Sub-total Amount
            const amountCols: number[] = [];
            let baseCol = 5;
            columns.forEach(() => {
              amountCols.push(baseCol);
              baseCol += 1;
            });
            amountCols.push(baseCol); // Sub-total Amount
            const lastRowNum = worksheet.lastRow ? worksheet.lastRow.number : tableStartRow;
            for (let rowNum = tableStartRow; rowNum <= lastRowNum; rowNum++) {
              amountCols.forEach(colIdx => {
                const cell = worksheet.getRow(rowNum).getCell(colIdx);
                cell.numFmt = '#,##0.00';
              });
            }
            // Add borders
            const tableEndRow = worksheet.lastRow ? worksheet.lastRow.number : tableStartRow;
            for (let rowNum = 3; rowNum <= tableEndRow; rowNum++) {
              const row = worksheet.getRow(rowNum);
              row.eachCell(cell => {
                cell.border = {
                  top: { style: 'thin' },
                  left: { style: 'thin' },
                  bottom: { style: 'thin' },
                  right: { style: 'thin' }
                };
              });
            }
            worksheet.getRow(1).font = { bold: true, size: 14 };
            worksheet.getRow(3).font = { bold: true };
            worksheet.getRow(4).font = { bold: true };
            // Auto width
            worksheet.columns.forEach(col => {
              let maxLength = 10;
              col.eachCell?.({ includeEmpty: true }, cell => {
                maxLength = Math.max(maxLength, (cell.value ? cell.value.toString().length : 0));
              });
              col.width = maxLength + 2;
            });
            // Download
            const now = new Date();
            const datetimeStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}T${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `service-summary-${datetimeStr}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          } else {
            alert('Failed to fetch data.');
          }
        } catch (err) {
          alert('Error downloading service summary report.');
        } finally {
          setLoading(false);
        }
        return;
      }
      if (maintenanceType === 'service' && reportType === 'monthly') {
        setLoading(true);
        try {
          const res = await authenticatedApi.get(`/api/bills/vehicle/filter?from=${startDate}&to=${endDate}`);
          const json = res.data as any;
          if (json.status === 'success' && Array.isArray(json.data)) {
            const allRows = json.data.map((item: any, idx: number) => ({
              No: idx + 1,
              inv_no: item.inv_no || '',
              inv_date: item.inv_date ? new Date(item.inv_date) : '',
              svc_order: item.svc_order || '',
              register_number: item.asset?.register_number || '',
              costcenter: item.costcenter?.name || '',
              district: item.district?.name || '',
              workshop: item.workshop?.name || '',
              svc_date: item.svc_date ? new Date(item.svc_date) : '',
              svc_odo: item.svc_odo || '',
              amount: item.inv_total ? Number(item.inv_total) : 0,
              remarks: item.inv_remarks || ''
            }));
            if (allRows.length === 0) {
              alert('No data found for the selected period.');
              setLoading(false);
              return;
            }
            // Get month and year from first inv_date
            const date = allRows[0].inv_date instanceof Date ? allRows[0].inv_date : new Date();
            const title = `Service Maintenance Report: ${date.toLocaleString('default', { month: 'long', year: 'numeric' })}`;
            // Calculate total amount
            const totalAmount = allRows.reduce((sum: number, row: { amount: number }) => sum + (row.amount || 0), 0);
            // Create workbook and worksheet
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Monthly Service');
            worksheet.addRow([title]);
            worksheet.addRow([]);
            worksheet.addRow([
              'No', 'Invoice No', 'Invoice Date', 'Service Order', 'Register Number', 'Costcenter', 'District', 'Workshop', 'Service Date', 'Odometer', 'Amount', 'Remarks'
            ]);
            const tableStartRow = worksheet.lastRow ? worksheet.lastRow.number : 4;
            allRows.forEach((row: typeof allRows[0]) => {
              worksheet.addRow([
                row.No,
                row.inv_no,
                row.inv_date instanceof Date ? row.inv_date.toLocaleDateString() : '',
                row.svc_order,
                row.register_number,
                row.costcenter,
                row.district,
                row.workshop,
                row.svc_date instanceof Date ? row.svc_date.toLocaleDateString() : '',
                row.svc_odo,
                row.amount,
                row.remarks
              ]);
            });
            // Add total row
            worksheet.addRow(['', '', '', '', '', '', '', '', '', 'Total', totalAmount, '']);
            // Add borders
            const tableEndRow = worksheet.lastRow ? worksheet.lastRow.number : tableStartRow;
            for (let rowNum = tableStartRow; rowNum <= tableEndRow; rowNum++) {
              const row = worksheet.getRow(rowNum);
              row.eachCell(cell => {
                cell.border = {
                  top: { style: 'thin' },
                  left: { style: 'thin' },
                  bottom: { style: 'thin' },
                  right: { style: 'thin' }
                };
              });
            }
            worksheet.getRow(1).font = { bold: true, size: 14 };
            worksheet.getRow(tableStartRow).font = { bold: true };
            if (worksheet.lastRow) {
              worksheet.lastRow.font = { bold: true };
            }
            // Set number format for Amount column
            const amountColIdx = 9;
            for (let rowNum = tableStartRow + 1; rowNum <= tableEndRow; rowNum++) {
              const cell = worksheet.getRow(rowNum).getCell(amountColIdx);
              cell.numFmt = '#,##0.00';
            }
            // Auto width
            worksheet.columns.forEach(col => {
              let maxLength = 10;
              col.eachCell?.({ includeEmpty: true }, cell => {
                maxLength = Math.max(maxLength, (cell.value ? cell.value.toString().length : 0));
              });
              col.width = maxLength + 2;
            });
            // Download
            const now = new Date();
            const datetimeStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}T${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
            const filename = `service-monthly-${date.toLocaleString('default', { month: 'short', year: 'numeric' }).replace(' ', '')}-${datetimeStr}.xlsx`;
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          } else {
            alert('Failed to fetch data.');
          }
        } catch (err) {
          alert('Error downloading monthly service report.');
        } finally {
          setLoading(false);
        }
        return;
      }
      // Implement download logic for other maintenance types
      alert(`Downloading ${maintenanceType} (${reportType}) report from ${startDate} to ${endDate}`);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      alert('Error downloading report.');
    }
  };

  return (
    <div className="mt-4">
      <h2 className="text-lg font-bold mb-4">Vehicle Maintenance Report</h2>
      <div className="flex flex-col md:flex-row gap-2 items-end">
        <div className="flex-1 min-w-[160px]">
          <label className="block mb-1 font-medium">Maintenance Type</label>
          <Select value={maintenanceType} onValueChange={setMaintenanceType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select maintenance type" />
            </SelectTrigger>
            <SelectContent>
              {maintenanceTypes.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block mb-1 font-medium">Report Type</label>
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select report type" />
            </SelectTrigger>
            <SelectContent>
              {reportTypes.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block mb-1 font-medium">Start Date</label>
          <Input
            type="date"
            className="w-full"
            value={startDate}
            max={maxDate}
            onChange={e => setStartDate(e.target.value)}
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block mb-1 font-medium">End Date</label>
          <Input
            type="date"
            className="w-full"
            value={endDate}
            max={maxDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </div>
        <div className="flex-shrink-0">
          <Button
            variant={"default"}
            onClick={handleDownload}
            disabled={!startDate || !endDate || loading}
          >
            {loading ? (
              <Loader2 className="animate-spin mr-2" />
            ) : (
              <FileSpreadsheet />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VehicleMtnReport;
