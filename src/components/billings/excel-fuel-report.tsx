import React, { useState, useEffect } from 'react';
import { authenticatedApi } from '@/config/api';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ExcelJS from 'exceljs';

const reportTypes = [
  { value: 'vehicle', label: 'By Vehicle' },
  { value: 'costcenter', label: 'By Cost Center' },
];

const FuelConsumptionReport = () => {
  const [reportType, setReportType] = useState('vehicle');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [costCenters, setCostCenters] = useState<{ id: string; name: string }[]>([]);
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>('all');

  useEffect(() => {
    authenticatedApi.get('/api/assets/costcenters').then((res: any) => {
      if (Array.isArray(res.data?.data)) {
        setCostCenters(res.data.data.map((cc: any) => ({ id: cc.id?.toString() || '', name: cc.name || '' })));
      }
    });
  }, []);

  const today = new Date();
  const lastDayPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const maxDate = `${lastDayPrevMonth.getFullYear()}-${pad(lastDayPrevMonth.getMonth() + 1)}-${pad(lastDayPrevMonth.getDate())}`;

  const handleDownload = async () => {
    setLoading(true);
    try {
      if (reportType === 'costcenter') {
        try {
          type Month = { month: number; expenses: string };
          type YearDetail = { year: number; expenses: string; months: Month[] };
          type Item = { costcenter: string; details: YearDetail[] };
          type ApiResponse = { status: string; message: string; data: Item[] };
          let url = `/api/bills/fuel/summary/costcenter?from=${startDate}&to=${endDate}`;
          if (selectedCostCenter && selectedCostCenter !== 'all') {
            url += `&cc=${selectedCostCenter}`;
          }
          const res = await authenticatedApi.get(url);
          const json = res.data as ApiResponse;
          if (json.status === 'success' && Array.isArray(json.data)) {
            // 1. Collect all years and months
            const yearMonthMap: Record<string, Set<number>> = {};
            json.data.forEach((item: any) => {
              (item.details || []).forEach((detail: any) => {
                const year = detail.year?.toString();
                if (year && Array.isArray(detail.months)) {
                  if (!yearMonthMap[year]) yearMonthMap[year] = new Set();
                  detail.months.forEach((m: any) => {
                    yearMonthMap[year].add(m.month);
                  });
                }
              });
            });
            const years = Object.keys(yearMonthMap).sort();
            years.forEach(y => {
              yearMonthMap[y] = new Set(Array.from(yearMonthMap[y]).sort((a, b) => a - b));
            });
            const columns: { year: string, month: number }[] = [];
            years.forEach(y => {
              Array.from(yearMonthMap[y]).forEach(m => {
                columns.push({ year: y, month: m });
              });
            });
            // 2. Prepare worksheet
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Costcenter Summary');
            worksheet.addRow(['Fuel Consumption Cost Center Summary Report']);
            worksheet.addRow([]);
            // Two-level header: Cost Center, then years (merged), months, and grand total
            const header1 = ['No', 'Cost Center'];
            const header2 = ['', ''];
            years.forEach(y => {
              const months = Array.from(yearMonthMap[y]);
              header1.push(y);
              for (let i = 1; i < months.length; i++) header1.push('');
              months.forEach(m => header2.push(new Date(Number(y), m - 1, 1).toLocaleString('default', { month: 'short' })));
            });
            header1.push('Total');
            header2.push('');
            worksheet.addRow(header1);
            worksheet.addRow(header2);
            // Merge year cells
            let col = 3;
            years.forEach(y => {
              const months = Array.from(yearMonthMap[y]);
              if (months.length > 0) {
                worksheet.mergeCells(3, col, 3, col + months.length - 1);
              }
              col += months.length;
            });
            // Merge Total cell
            worksheet.mergeCells(3, col, 4, col);
            // Row span for first 2 columns
            worksheet.mergeCells(3, 1, 4, 1);
            worksheet.mergeCells(3, 2, 4, 2);
            // 3. Add data rows
            const tableStartRow = worksheet.lastRow ? worksheet.lastRow.number + 1 : 5;
            let no = 1;
            json.data.forEach((item: any) => {
              const row: any[] = [no++, item.costcenter];
              let grandTotal = 0;
              years.forEach(y => {
                const detail = (item.details || []).find((d: any) => d.year?.toString() === y);
                const months = Array.from(yearMonthMap[y]);
                months.forEach(m => {
                  const monthObj = detail && Array.isArray(detail.months) ? detail.months.find((mo: any) => mo.month === m) : undefined;
                  const val = monthObj ? parseFloat(monthObj.expenses) : 0;
                  row.push(val);
                  grandTotal += val;
                });
              });
              row.push(grandTotal);
              worksheet.addRow(row);
            });
            // Set number format for amount columns and total
            const amountStartCol = 3;
            const amountEndCol = amountStartCol + columns.length;
            const totalCol = amountEndCol + 1;
            const lastRowNum = worksheet.lastRow ? worksheet.lastRow.number : tableStartRow;
            for (let rowNum = tableStartRow; rowNum <= lastRowNum; rowNum++) {
              for (let colIdx = amountStartCol; colIdx <= totalCol; colIdx++) {
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
            worksheet.columns.forEach(col => {
              let maxLength = 10;
              col.eachCell?.({ includeEmpty: true }, cell => {
                maxLength = Math.max(maxLength, (cell.value ? cell.value.toString().length : 0));
              });
              col.width = maxLength + 2;
            });
            const now = new Date();
            const datetimeStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}T${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `fuel-costcenter-summary-${datetimeStr}.xlsx`;
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
      if (reportType === 'vehicle') {
        try {
          let url = `/api/bills/fuel/summary/vehicle?from=${startDate}&to=${endDate}`;
          if (selectedCostCenter && selectedCostCenter !== 'all') {
            url += `&cc=${selectedCostCenter}`;
          }
          const res = await authenticatedApi.get(url);
          const json = res.data as any;
          if (json.status === 'success' && Array.isArray(json.data)) {
            const yearMonthMap: Record<string, Set<number>> = {};
            json.data.forEach((item: any) => {
              (item.details || []).forEach((detail: any) => {
                const year = detail.year?.toString();
                if (year && Array.isArray(detail.monthly_expenses)) {
                  if (!yearMonthMap[year]) yearMonthMap[year] = new Set();
                  detail.monthly_expenses.forEach((expense: any) => {
                    if (expense.stmt_date) {
                      const d = new Date(expense.stmt_date);
                      yearMonthMap[year].add(d.getMonth() + 1);
                    }
                  });
                }
              });
            });
            const years = Object.keys(yearMonthMap).sort();
            years.forEach(y => {
              yearMonthMap[y] = new Set(Array.from(yearMonthMap[y]).sort((a, b) => a - b));
            });
            const columns: { year: string, month: number }[] = [];
            years.forEach(y => {
              Array.from(yearMonthMap[y]).forEach(m => {
                columns.push({ year: y, month: m });
              });
            });
            const rows: Record<string, any> = {};
            json.data.forEach((item: any) => {
              const key = `${item.vehicle}|${item.costcenter?.name}|${item.location?.name}`;
              if (!rows[key]) {
                rows[key] = {
                  vehicle: item.vehicle || '',
                  category: item.category?.name || '',
                  brand: item.brand?.name || '',
                  transmission: item.transmission || '',
                  fuel_type: item.fuel || '',
                  age: item.age || '',
                  costcenter: item.costcenter?.name || '',
                  location: item.location?.name || '',
                  model: item.model?.name || '',
                  owner: item.owner?.name || '',
                  classification: item.classification || '',
                  record_status: item.record_status || '',
                  total_litre: item.total_litre || 0,
                  total_amount: item.total_amount || 0,
                  amounts: {} as Record<string, number>
                };
              }
              (item.details || []).forEach((detail: any) => {
                const year = detail.year?.toString();
                if (year && Array.isArray(detail.monthly_expenses)) {
                  detail.monthly_expenses.forEach((expense: any) => {
                    if (expense.stmt_date) {
                      const d = new Date(expense.stmt_date);
                      const month = d.getMonth() + 1;
                      const colKey = `${year}-${month}`;
                      rows[key].amounts[colKey] = expense.amount ? Number(expense.amount) : 0;
                    }
                  });
                }
              });
            });
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Fuel Summary');

            // Get cost center name for title
            const selectedCostCenterName = selectedCostCenter === 'all'
              ? 'All'
              : costCenters.find(cc => cc.id === selectedCostCenter)?.name || 'All';

            // Add title row
            const titleRow = worksheet.addRow([`Vehicle Fuel Summary: ${selectedCostCenterName}`]);
            titleRow.getCell(1).font = { bold: true, size: 14 };
            titleRow.getCell(1).alignment = { horizontal: 'center' };

            // Add empty row for spacing
            worksheet.addRow([]);

            // Add date range and filter information
            worksheet.addRow([`Date Range: ${startDate} to ${endDate}`]);
            worksheet.addRow([]);

            // Create headers
            const header1 = ['No', 'Vehicle', 'Category', 'Brand', 'Model', 'Trans.', 'Fuel', 'Age', 'Cost Center', 'Location', 'Owner', 'Classification', 'Record Status'];
            const header2 = ['', '', '', '', '', '', '', '', '', '', '', '', ''];

            // Add year-month columns for amounts
            years.forEach(y => {
              const months = Array.from(yearMonthMap[y]);
              header1.push(y);
              for (let i = 1; i < months.length; i++) header1.push('');
              months.forEach(m => header2.push(new Date(Number(y), m - 1, 1).toLocaleString('default', { month: 'short' })));
            });

            // Add total column
            header1.push('Sub Total');
            header2.push('');

            // Merge title across all columns
            const totalColumns = header1.length;
            worksheet.mergeCells(1, 1, 1, totalColumns);

            worksheet.addRow(header1);
            worksheet.addRow(header2);
            // Merge year cells for amounts
            let col = 14; // Start after basic columns (No, Vehicle, Category, Brand, Model, Trans, Fuel, Age, Cost Center, Location, Owner, Classification, Record Status)
            years.forEach(y => {
              const months = Array.from(yearMonthMap[y]);
              if (months.length > 1) {
                worksheet.mergeCells(worksheet.lastRow!.number - 1, col, worksheet.lastRow!.number - 1, col + months.length - 1);
              }
              col += months.length;
            });

            // Merge Sub Total cell
            worksheet.mergeCells(worksheet.lastRow!.number - 1, col, worksheet.lastRow!.number, col);

            // Merge basic column headers (span 2 rows)
            for (let i = 1; i <= 13; i++) {
              worksheet.mergeCells(worksheet.lastRow!.number - 1, i, worksheet.lastRow!.number, i);
            }
            const tableStartRow = worksheet.lastRow ? worksheet.lastRow.number + 1 : 8;
            let no = 1;
            Object.values(rows).forEach((row: any) => {
              // Amount columns for each year-month
              const amounts = columns.map(c => {
                const val = row.amounts[`${c.year}-${c.month}`];
                return val !== undefined && val !== '' ? Number(val) : 0;
              });

              // Calculate sub total
              const subTotal = amounts.reduce((sum, amount) => sum + amount, 0);

              worksheet.addRow([
                no++,
                row.vehicle,
                row.category,
                row.brand,
                row.model,
                row.transmission,
                row.fuel_type,
                row.age,
                row.costcenter,
                row.location,
                row.owner,
                row.classification,
                row.record_status,
                ...amounts,
                subTotal
              ]);
            });
            // Format number columns
            const basicColumnsCount = 13; // No, Vehicle, Category, Brand, Model, Trans, Fuel, Age, Cost Center, Location, Owner, Classification, Record Status
            const amountStartCol = basicColumnsCount + 1;
            const amountEndCol = amountStartCol + columns.length - 1;
            const subTotalCol = amountEndCol + 1;
            const lastRowNum = worksheet.lastRow ? worksheet.lastRow.number : tableStartRow;

            // Format amount and total columns
            for (let rowNum = tableStartRow; rowNum <= lastRowNum; rowNum++) {
              // Format monthly amount columns
              for (let colIdx = amountStartCol; colIdx <= amountEndCol; colIdx++) {
                const cell = worksheet.getRow(rowNum).getCell(colIdx);
                cell.numFmt = '#,##0.00';
              }

              // Format Sub Total column
              const subTotalCell = worksheet.getRow(rowNum).getCell(subTotalCol);
              subTotalCell.numFmt = '#,##0.00';
            }

            // Add borders to all cells
            const tableEndRow = worksheet.lastRow ? worksheet.lastRow.number : tableStartRow;
            const headerStartRow = tableStartRow - 2; // Account for the two-row header
            for (let rowNum = headerStartRow; rowNum <= tableEndRow; rowNum++) {
              const row = worksheet.getRow(rowNum);
              row.eachCell({ includeEmpty: false }, cell => {
                cell.border = {
                  top: { style: 'thin' },
                  left: { style: 'thin' },
                  bottom: { style: 'thin' },
                  right: { style: 'thin' }
                };
              });
            }

            // Style the headers and title
            worksheet.getRow(1).font = { bold: true, size: 14 };
            worksheet.getRow(3).font = { bold: true };
            worksheet.getRow(4).font = { bold: true };
            worksheet.getRow(headerStartRow).font = { bold: true };
            worksheet.getRow(headerStartRow + 1).font = { bold: true };

            // Auto-fit columns
            worksheet.columns.forEach(col => {
              let maxLength = 10;
              col.eachCell?.({ includeEmpty: true }, cell => {
                maxLength = Math.max(maxLength, (cell.value ? cell.value.toString().length : 0));
              });
              col.width = maxLength + 2;
            });
            const now = new Date();
            const datetimeStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}T${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `fuel-vehicle-summary-${datetimeStr}.xlsx`;
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
      alert(`Downloading ${reportType} report from ${startDate} to ${endDate}`);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      alert('Error downloading report.');
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <div className="flex items-center space-x-2">
        <FileSpreadsheet className="h-5 w-5 text-green-600" />
      <h2 className="text-2xl font-bold">Fuel Billing Report</h2>
      </div>
      <div className="text-sm text-yellow-700 bg-yellow-100 border-l-4 border-yellow-400 p-3 my-2 rounded">
        <strong>Notice:</strong> The generated report is based on the statement month. Fuel consumption bills are typically received in the following month.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 items-center gap-4">
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
        <div className="flex-1 min-w-[160px]">
          <label className="block mb-1 font-medium">Cost Center</label>
          <Select
            value={selectedCostCenter}
            onValueChange={setSelectedCostCenter}
            disabled={reportType === 'costcenter'}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Cost Centers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cost Centers</SelectItem>
              {costCenters.map(cc => (
                <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>
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
        <div className="flex mt-5.5">
          <Button
            onClick={handleDownload}
            disabled={!startDate || !endDate || loading}
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <FileSpreadsheet />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FuelConsumptionReport;
