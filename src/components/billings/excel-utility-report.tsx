import React, { useState, useEffect } from 'react';
import { authenticatedApi } from '@/config/api';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ExcelJS from 'exceljs';

const reportTypes = [
  { value: 'service', label: 'By Service' },
  { value: 'costcenter', label: 'By Cost Center' },
];

const serviceTypes = [
  { value: 'all', label: 'All Services' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'rental', label: 'Rental' },
  { value: 'services', label: 'Services' },
  { value: 'printing', label: 'Printing' },
];

const UtilityReport = () => {
  const [reportType, setReportType] = useState('service');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [costCenters, setCostCenters] = useState<{ id: string; name: string }[]>([]);
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<string>('all');

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
          type CostCenterItem = { costcenter: string; details: YearDetail[] };
          type ApiResponse = { status: string; message: string; data: CostCenterItem[] };

          let url = `/api/bills/util/summary/costcenter?from=${startDate}&to=${endDate}`;
          if (selectedService && selectedService !== 'all') {
            url += `&service=${selectedService}`;
          }

          const res = await authenticatedApi.get(url);
          const json = res.data as ApiResponse;

          if (json.status === 'success' && Array.isArray(json.data)) {
            // 1. Collect all years and months from the data
            const yearMonthMap: Record<string, Set<number>> = {};
            json.data.forEach((item: CostCenterItem) => {
              (item.details || []).forEach((detail: YearDetail) => {
                const year = detail.year?.toString();
                if (year && Array.isArray(detail.months)) {
                  if (!yearMonthMap[year]) yearMonthMap[year] = new Set();
                  detail.months.forEach((m: Month) => {
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

            // 2. Prepare Excel worksheet
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Utility Costcenter Summary');

            // Add title with filter information
            const selectedServiceLabel = serviceTypes.find(s => s.value === selectedService)?.label || 'All Services';
            worksheet.addRow([`Utility Cost Center Summary Report - Service: ${selectedServiceLabel}`]);
            worksheet.addRow([`Date Range: ${startDate} to ${endDate}`]);
            worksheet.addRow([]);

            // Create two-level header: Cost Center, then years (merged), months, and grand total
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
              if (months.length > 1) {
                worksheet.mergeCells(3, col, 3, col + months.length - 1);
              }
              col += months.length;
            });

            // Merge Total cell
            worksheet.mergeCells(4, col, 5, col);

            // Row span for first 2 columns
            worksheet.mergeCells(4, 1, 5, 1);
            worksheet.mergeCells(4, 2, 5, 2);

            // 3. Add data rows
            const tableStartRow = worksheet.lastRow ? worksheet.lastRow.number + 1 : 6;
            let no = 1;
            json.data.forEach((item: CostCenterItem) => {
              const row: any[] = [no++, item.costcenter];
              let grandTotal = 0;
              years.forEach(y => {
                const detail = (item.details || []).find((d: YearDetail) => d.year?.toString() === y);
                const months = Array.from(yearMonthMap[y]);
                months.forEach(m => {
                  const monthObj = detail && Array.isArray(detail.months) ? detail.months.find((mo: Month) => mo.month === m) : undefined;
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

            // Add borders to all cells
            const tableEndRow = worksheet.lastRow ? worksheet.lastRow.number : tableStartRow;
            for (let rowNum = 4; rowNum <= tableEndRow; rowNum++) {
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

            // Style the headers
            worksheet.getRow(1).font = { bold: true, size: 14 };
            worksheet.getRow(4).font = { bold: true };
            worksheet.getRow(5).font = { bold: true };

            // Auto-size columns
            worksheet.columns.forEach((col: any) => {
              let maxLength = 10;
              col.eachCell?.({ includeEmpty: true }, (cell: any) => {
                maxLength = Math.max(maxLength, (cell.value ? cell.value.toString().length : 0));
              });
              col.width = maxLength + 2;
            });

            // Download the file
            const now = new Date();
            const datetimeStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}T${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
            const costCenterServiceLabel = serviceTypes.find(s => s.value === selectedService)?.label || 'All-Services';
            const safeCostCenterServiceLabel = costCenterServiceLabel.replace(/\s+/g, '-');
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `utility-costcenter-${safeCostCenterServiceLabel}-${datetimeStr}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          } else {
            alert('Failed to fetch data.');
          }
        } catch (err) {
          console.error('Error downloading costcenter report:', err);
          alert('Error downloading report.');
        } finally {
          setLoading(false);
        }
        return;
      }

      if (reportType === 'service') {
        try {
          type Month = { month: number; expenses: string };
          type YearDetail = { year: number; expenses: string; months: Month[] };
          type ServiceItem = { service: string; details: YearDetail[] };
          type ServiceApiResponse = { status: string; message: string; data: ServiceItem[] };

          let url = `/api/bills/util/summary/service?from=${startDate}&to=${endDate}`;
          if (selectedCostCenter && selectedCostCenter !== 'all') {
            url += `&costcenter=${selectedCostCenter}`;
          }

          const res = await authenticatedApi.get(url);
          const json = res.data as ServiceApiResponse;

          if (json.status === 'success' && Array.isArray(json.data)) {
            // 1. Collect all years and months from the service data
            const yearMonthMap: Record<string, Set<number>> = {};
            json.data.forEach((item: ServiceItem) => {
              (item.details || []).forEach((detail: YearDetail) => {
                const year = detail.year?.toString();
                if (year && Array.isArray(detail.months)) {
                  if (!yearMonthMap[year]) yearMonthMap[year] = new Set();
                  detail.months.forEach((m: Month) => {
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

            // 2. Prepare Excel worksheet
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Utility Service Summary');

            // Add title with filter information
            const selectedCostCenterLabel = selectedCostCenter === 'all'
              ? 'All Cost Centers'
              : costCenters.find(cc => cc.id === selectedCostCenter)?.name || 'Unknown Cost Center';
            worksheet.addRow([`Utility Service Summary Report - Cost Center: ${selectedCostCenterLabel}`]);
            worksheet.addRow([`Date Range: ${startDate} to ${endDate}`]);
            worksheet.addRow([]);

            // Create two-level header: Service, then years (merged), months, and grand total
            const header1 = ['No', 'Service'];
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
              if (months.length > 1) {
                worksheet.mergeCells(4, col, 4, col + months.length - 1);
              }
              col += months.length;
            });

            // Merge Total cell
            worksheet.mergeCells(4, col, 5, col);

            // Row span for first 2 columns
            worksheet.mergeCells(4, 1, 5, 1);
            worksheet.mergeCells(4, 2, 5, 2);

            // 3. Add data rows
            const tableStartRow = worksheet.lastRow ? worksheet.lastRow.number + 1 : 6;
            let no = 1;
            json.data.forEach((item: ServiceItem) => {
              const row: any[] = [no++, item.service];
              let grandTotal = 0;
              years.forEach(y => {
                const detail = (item.details || []).find((d: YearDetail) => d.year?.toString() === y);
                const months = Array.from(yearMonthMap[y]);
                months.forEach(m => {
                  const monthObj = detail && Array.isArray(detail.months) ? detail.months.find((mo: Month) => mo.month === m) : undefined;
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

            // Add borders to all cells
            const tableEndRow = worksheet.lastRow ? worksheet.lastRow.number : tableStartRow;
            for (let rowNum = 4; rowNum <= tableEndRow; rowNum++) {
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

            // Style the headers
            worksheet.getRow(1).font = { bold: true, size: 14 };
            worksheet.getRow(4).font = { bold: true };
            worksheet.getRow(5).font = { bold: true };

            // Auto-size columns
            worksheet.columns.forEach((col: any) => {
              let maxLength = 10;
              col.eachCell?.({ includeEmpty: true }, (cell: any) => {
                maxLength = Math.max(maxLength, (cell.value ? cell.value.toString().length : 0));
              });
              col.width = maxLength + 2;
            });

            // Download the file
            const now = new Date();
            const datetimeStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}T${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
            const serviceCostCenterLabel = selectedCostCenter === 'all'
              ? 'All-Cost-Centers'
              : costCenters.find(cc => cc.id === selectedCostCenter)?.name?.replace(/\s+/g, '-') || 'Unknown-Cost-Center';
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `utility-service-${serviceCostCenterLabel}-${datetimeStr}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          } else {
            alert('Failed to fetch data.');
          }
        } catch (err) {
          console.error('Error downloading service report:', err);
          alert('Error downloading report.');
        } finally {
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error generating report.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <div className="flex items-center space-x-2">
        <FileSpreadsheet className="h-5 w-5 text-green-600" />
        <h2 className="text-2xl font-bold">Utilities Billing Report</h2>
      </div>
      <div className="text-sm text-yellow-700 bg-yellow-100 border-l-4 border-yellow-400 p-2 mb-4 rounded">
        <strong>Notice:</strong> The generated report is based on the statement month. Fuel consumption bills are typically received in the following month.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div>
          <label className="block text-sm font-medium">Report Type</label>
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className='w-full'>
              <SelectValue placeholder="Select report type" />
            </SelectTrigger>
            <SelectContent>
              {reportTypes.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {reportType === 'costcenter' && (
          <div>
            <label className="block text-sm font-medium">Service</label>
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger className='w-full'>
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                {serviceTypes.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {reportType === 'service' && (
          <div>
            <label className="block text-sm font-medium">Cost Center</label>
            <Select value={selectedCostCenter} onValueChange={setSelectedCostCenter}>
              <SelectTrigger className='w-full'>
                <SelectValue placeholder="Select cost center" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cost Centers</SelectItem>
                {costCenters.map(cc => (
                  <SelectItem key={cc.id} value={cc.id}>
                    {cc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium">Start Date</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            max={maxDate}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">End Date</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            max={maxDate}
          />
        </div>
        <div className="block mt-6.5">
          <Button
            onClick={handleDownload}
            disabled={loading || !startDate || !endDate}
            className="flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            {/* {loading ? 'Generating...' : 'Download Excel Report'} */}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UtilityReport;
