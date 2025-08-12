import React, { useState, useEffect } from 'react';
import { authenticatedApi } from '@/config/api';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ExcelJS from 'exceljs';

// Updated interfaces to match actual API response
interface MaintenanceItem {
    inv_id: number;
    inv_no: string;
    inv_date: string;
    svc_order: string;
    svc_date: string;
    svc_odo: string;
    amount: string;
}

interface YearDetail {
    year: number;
    expenses: string;
    maintenance: MaintenanceItem[];
}

interface VehicleData {
    vehicle_id: number;
    vehicle: string;
    category: { id: number; name: string };
    brand: { id: number; name: string };
    model: { id: number; name: string };
    owner: { ramco_id: string; name: string };
    transmission: string;
    fuel: string;
    purchase_date: string;
    age: number;
    costcenter: { id: number; name: string };
    district: { id: number; code: string };
    classification: string;
    record_status: string;
    total_maintenance: number;
    total_amount: number;
    details: YearDetail[];
}

interface VehicleApiResponse {
    status: string;
    message: string;
    data: VehicleData[];
}

// Legacy interface for cost center report (keeping for backward compatibility)
interface LegacyMonth {
    month: number;
    expenses: string;
}

interface LegacyYearDetail {
    year: number;
    expenses: string;
    months: LegacyMonth[];
}

interface LegacyItem {
    costcenter: string;
    details: LegacyYearDetail[];
}

interface LegacyApiResponse {
    status: string;
    message: string;
    data: LegacyItem[];
}

const reportTypes = [
    { value: 'vehicle', label: 'By Vehicle' },
    { value: 'costcenter', label: 'By Cost Center' },
];

const MaintenanceReport = () => {
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
        // Validation
        if (!startDate || !endDate) {
            alert('Please select both start and end dates.');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            alert('Start date cannot be after end date.');
            return;
        }

        setLoading(true);
        try {
            if (reportType === 'costcenter') {
                try {
                    let url = `/api/bills/mtn/summary/costcenter?from=${startDate}&to=${endDate}`;
                    if (selectedCostCenter && selectedCostCenter !== 'all') {
                        url += `&cc=${selectedCostCenter}`;
                    }

                    const res = await authenticatedApi.get(url);
                    const json = res.data as LegacyApiResponse;

                    if (json.status === 'success' && Array.isArray(json.data)) {
                        const workbook = new ExcelJS.Workbook();
                        const worksheet = workbook.addWorksheet('Maintenance Report by Cost Center');

                        // Header styling
                        const headerRow = worksheet.addRow(['Cost Center', 'Year', 'Total Expenses (RM)', 'Monthly Breakdown']);
                        headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
                        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '366092' } };
                        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

                        // Add monthly headers
                        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        const monthHeaders = worksheet.addRow(['', '', '', ...monthNames]);
                        monthHeaders.font = { bold: true };
                        monthHeaders.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E7E6E6' } };

                        // Process data
                        json.data.forEach((item: LegacyItem) => {
                            item.details.forEach((detail: LegacyYearDetail) => {
                                const monthlyData = new Array(12).fill(0);
                                detail.months.forEach((month: LegacyMonth) => {
                                    if (month.month >= 1 && month.month <= 12) {
                                        monthlyData[month.month - 1] = parseFloat(month.expenses) || 0;
                                    }
                                });

                                const row = worksheet.addRow([
                                    item.costcenter,
                                    detail.year,
                                    parseFloat(detail.expenses).toFixed(2),
                                    '',
                                    ...monthlyData.map(val => val.toFixed(2))
                                ]);

                                // Format currency columns
                                for (let i = 3; i <= 15; i++) {
                                    const cell = row.getCell(i);
                                    if (i === 3) {
                                        cell.numFmt = '"RM" #,##0.00';
                                        cell.font = { bold: true };
                                    } else {
                                        cell.numFmt = '#,##0.00';
                                    }
                                }
                            });
                        });

                        // Auto-fit columns
                        worksheet.columns.forEach((column) => {
                            if (column.values) {
                                const maxLength = Math.max(
                                    ...column.values.map((v: any) => v ? v.toString().length : 0)
                                );
                                column.width = Math.min(maxLength + 2, 50);
                            }
                        });

                        const buffer = await workbook.xlsx.writeBuffer();
                        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `Vehicle-Maintenance-Report-CostCenter-${startDate}-to-${endDate}.xlsx`;
                        link.click();
                        window.URL.revokeObjectURL(url);
                    }
                } catch (error) {
                    console.error('Error generating cost center report:', error);
                    alert('Error generating cost center report. Please try again.');
                }
            } else if (reportType === 'vehicle') {
                try {
                    let url = `/api/bills/mtn/summary/vehicle?from=${startDate}&to=${endDate}`;
                    if (selectedCostCenter && selectedCostCenter !== 'all') {
                        url += `&cc=${selectedCostCenter}`;
                    }

                    console.log('Vehicle report URL:', url); // Debug log

                    const res = await authenticatedApi.get(url);
                    console.log('API response:', res.data); // Debug log

                    const json = res.data as VehicleApiResponse;

                    if (json.status === 'success' && Array.isArray(json.data)) {
                        const workbook = new ExcelJS.Workbook();
                        const worksheet = workbook.addWorksheet('Maintenance Report by Vehicle');

                        // Get cost center name for title
                        const selectedCostCenterName = selectedCostCenter === 'all'
                            ? 'All'
                            : costCenters.find(cc => cc.id === selectedCostCenter)?.name || 'All';

                        // Add title row
                        const titleRow = worksheet.addRow([`Vehicle Maintenance Summary: ${selectedCostCenterName}`]);
                        titleRow.getCell(1).font = { bold: true, size: 14 };
                        titleRow.getCell(1).alignment = { horizontal: 'center' };

                        // Add empty row for spacing
                        worksheet.addRow([]);

                        // Add date range information
                        worksheet.addRow([`Date Range: ${startDate} to ${endDate}`]);
                        worksheet.addRow([]);

                        // Analyze data to determine which year-month combinations exist
                        const yearMonthMap: Record<string, Set<number>> = {};
                        json.data.forEach((vehicle: VehicleData) => {
                            if (vehicle.details && Array.isArray(vehicle.details)) {
                                vehicle.details.forEach((yearDetail: YearDetail) => {
                                    if (yearDetail.maintenance && Array.isArray(yearDetail.maintenance)) {
                                        yearDetail.maintenance.forEach((maintenance: MaintenanceItem) => {
                                            if (maintenance.inv_date) {
                                                const date = new Date(maintenance.inv_date);
                                                const year = date.getFullYear().toString();
                                                const month = date.getMonth() + 1; // 1-12

                                                if (!yearMonthMap[year]) yearMonthMap[year] = new Set();
                                                yearMonthMap[year].add(month);
                                            }
                                        });
                                    }
                                });
                            }
                        });

                        const years = Object.keys(yearMonthMap).sort();
                        years.forEach(y => {
                            yearMonthMap[y] = new Set(Array.from(yearMonthMap[y]).sort((a, b) => a - b));
                        });

                        // Create column structure for dynamic months
                        const columns: { year: string, month: number }[] = [];
                        years.forEach(y => {
                            Array.from(yearMonthMap[y]).forEach(m => {
                                columns.push({ year: y, month: m });
                            });
                        });

                        // Create headers
                        const header1 = ['No', 'Vehicle', 'Category', 'Brand', 'Model', 'Trans.', 'Fuel', 'Age', 'Cost Center', 'District', 'Owner', 'Classification', 'Record Status'];
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
                        let col = 14; // Start after basic columns
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

                        // Process each vehicle
                        json.data.forEach((vehicle: VehicleData) => {
                            try {
                                // Initialize amounts object for this vehicle
                                const amounts: Record<string, number> = {};

                                // Process maintenance details to get amounts by year-month
                                if (vehicle.details && Array.isArray(vehicle.details)) {
                                    vehicle.details.forEach((yearDetail: YearDetail) => {
                                        if (yearDetail.maintenance && Array.isArray(yearDetail.maintenance)) {
                                            yearDetail.maintenance.forEach((maintenance: MaintenanceItem) => {
                                                if (maintenance.inv_date && maintenance.amount) {
                                                    const date = new Date(maintenance.inv_date);
                                                    const year = date.getFullYear();
                                                    const month = date.getMonth() + 1;
                                                    const colKey = `${year}-${month}`;
                                                    amounts[colKey] = (amounts[colKey] || 0) + (parseFloat(maintenance.amount) || 0);
                                                }
                                            });
                                        }
                                    });
                                }

                                // Amount columns for each year-month
                                const columnAmounts = columns.map(c => {
                                    const val = amounts[`${c.year}-${c.month}`];
                                    return val !== undefined ? val : 0;
                                });

                                // Calculate sub total
                                const subTotal = columnAmounts.reduce((sum, amount) => sum + amount, 0);

                                worksheet.addRow([
                                    no++,
                                    vehicle.vehicle || '',
                                    vehicle.category?.name || '',
                                    vehicle.brand?.name || '',
                                    vehicle.model?.name || '',
                                    vehicle.transmission || '',
                                    vehicle.fuel || '',
                                    vehicle.age || 0,
                                    vehicle.costcenter?.name || '',
                                    vehicle.district?.code || '',
                                    vehicle.owner?.name || '',
                                    vehicle.classification || '',
                                    vehicle.record_status || '',
                                    ...columnAmounts,
                                    subTotal
                                ]);

                            } catch (vehicleError) {
                                console.error(`Error processing vehicle ${vehicle.vehicle}:`, vehicleError);
                            }
                        });

                        // Format number columns
                        const basicColumnsCount = 13; // No, Vehicle, Category, Brand, Model, Trans, Fuel, Age, Cost Center, District, Owner, Classification, Record Status
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
                        worksheet.getRow(headerStartRow).font = { bold: true };
                        worksheet.getRow(headerStartRow + 1).font = { bold: true };

                        // Auto-fit columns
                        worksheet.columns.forEach((column: any, index: number) => {
                            if (index === 0) {
                                column.width = 5; // No column
                            } else if (index < 13) {
                                // Info columns
                                column.width = Math.max(12, Math.min(25, (header1[index]?.length || 10) + 2));
                            } else {
                                // Amount columns
                                column.width = 10;
                            }
                        });

                        const buffer = await workbook.xlsx.writeBuffer();
                        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `Vehicle-Maintenance-Report-${startDate}-to-${endDate}.xlsx`;
                        link.click();
                        window.URL.revokeObjectURL(url);
                    } else {
                        console.error('Invalid API response:', json);
                        alert(`Error: ${json.message || 'Invalid response from server'}`);
                    }
                } catch (error) {
                    console.error('Error generating vehicle report:', error);
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    alert(`Error generating vehicle report: ${errorMessage}. Please check the console for details.`);
                }
            }
        } catch (error) {
            console.error('Error downloading maintenance report:', error);
            alert('Error downloading maintenance report. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
            <div className="flex items-center space-x-2">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                <h2 className="text-lg font-semibold">Vehicle Maintenance Excel Report</h2>
            </div>
            <div className="text-sm text-yellow-700 bg-yellow-100 border-l-4 border-yellow-400 p-2 mb-4 rounded">
                <strong>Notice:</strong> The generated report is based on the statement month. Fuel consumption bills are typically received in the following month.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Report Type
                    </label>
                    <Select value={reportType} onValueChange={setReportType}>
                        <SelectTrigger className='w-full'>
                            <SelectValue placeholder="Select report type" />
                        </SelectTrigger>
                        <SelectContent>
                            {reportTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cost Center
                    </label>
                    <Select value={selectedCostCenter} onValueChange={setSelectedCostCenter}>
                        <SelectTrigger className='w-full'>
                            <SelectValue placeholder="Select cost center" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Cost Centers</SelectItem>
                            {costCenters.map((cc) => (
                                <SelectItem key={cc.id} value={cc.id}>
                                    {cc.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date
                    </label>
                    <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        max={maxDate}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date
                    </label>
                    <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        max={maxDate}
                    />
                </div>
                <div className="flex mt-6.5">
                    <Button
                        onClick={handleDownload}
                        disabled={!startDate || !endDate || loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Generating Report...
                            </>
                        ) : (
                            <>
                                <FileSpreadsheet className="h-4 w-4" />
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {(!startDate || !endDate) && (
                <p className="text-sm text-gray-500 text-center">
                    Please select both start and end dates to generate the report.
                </p>
            )}
        </div>
    );
};

export default MaintenanceReport;
