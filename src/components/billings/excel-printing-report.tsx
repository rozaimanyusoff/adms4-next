import React, { useState, useEffect } from 'react';
import { authenticatedApi } from '@/config/api';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SingleSelect, type ComboboxOption } from '@/components/ui/combobox';
import ExcelJS from 'exceljs';

interface MonthlyExpense {
    month: string;
    util_id?: number;
    ubill_date?: string;
    ubill_rent?: string;
    ubill_color?: string;
    ubill_bw?: string;
    ubill_gtotal?: string;
}

interface AccountDetail {
    bill_id: number;
    account: string;
    total_monthly?: string;
    costcenter?: string;
    cc_id?: number;
    monthly_expenses: MonthlyExpense[];
}

interface YearBlock {
    year: number;
    total_annual: string;
    details: AccountDetail[];
}

interface ApiResponse {
    status: string;
    message: string;
    data: YearBlock[];
}

const monthOrder = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const PrintingExcelReport: React.FC = () => {
    const [beneficiaryId, setBeneficiaryId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [costCenters, setCostCenters] = useState<ComboboxOption[]>([]);
    const [selectedCostCenter, setSelectedCostCenter] = useState<string>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        authenticatedApi.get('/api/assets/costcenters').then((res: any) => {
            if (Array.isArray(res.data?.data)) {
                setCostCenters(res.data.data.map((cc: any) => ({ value: cc.id?.toString() || '', label: cc.name || '' })));
            }
        }).catch(() => {});
    }, []);

    const handleDownload = async (overrideJson?: ApiResponse) => {
        // Require date range to avoid empty responses
        if (!startDate || !endDate) {
            alert('Please select Start Date and End Date');
            return;
        }

        setLoading(true);
        try {
            // Build endpoint - choose a reasonable default path
            // If a beneficiaryId is provided, use a beneficiary-scoped endpoint
            let url = '/api/bills/util/printing/summary';
            // prefer explicit date range if provided
            const params: string[] = [];
            if (beneficiaryId) params.push(`beneficiary=${beneficiaryId}`);
            if (selectedCostCenter && selectedCostCenter !== 'all') params.push(`cc=${selectedCostCenter}`);
            if (startDate) params.push(`from=${startDate}`);
            if (endDate) params.push(`to=${endDate}`);
            if (params.length) url += `?${params.join('&')}`;

            let json: ApiResponse;
            if (overrideJson) {
                json = overrideJson;
            } else {
                const res = await authenticatedApi.get(url);
                json = res.data as ApiResponse;
            }

            if (json.status !== 'success' || !Array.isArray(json.data)) {
                throw new Error('Invalid API response');
            }

            const workbook = new ExcelJS.Workbook();
            const summaryRows: { year: number; account: string; costcenter?: string; monthly: number[]; total: number }[] = [];

            // helper to render a type-specific table (Color or B/W)
            const addUsageTable = (
                worksheet: ExcelJS.Worksheet,
                yearBlock: YearBlock,
                usageLabel: string,
                usageKey: 'ubill_color' | 'ubill_bw' | 'ubill_rent'
            ) => {
                // Section title
                const sectionTitle = [`${usageLabel} Usage`];
                const titleRow = worksheet.addRow(sectionTitle);
                titleRow.font = { bold: true };
                worksheet.addRow([]);

                // Single header row with short month names
                const baseHeaders = ['No','Account','Cost Center', ...monthOrder.map(m => m.slice(0,3)), 'Total'];
                worksheet.addRow(baseHeaders);
                const headerIndex = worksheet.lastRow ? worksheet.lastRow.number : 1;
                const headerRow = worksheet.getRow(headerIndex);
                headerRow.font = { bold: true };
                headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E7E6E6' } };

                // Prepare month totals accumulator for this section
                const monthTotals: number[] = new Array(12).fill(0);

                let accountSeq = 1;
                yearBlock.details.forEach((acc) => {
                    if (!acc || !acc.account) return; // defensive - ensure account field exists

                    const monthlyValues = monthOrder.map(mn => {
                        const expenses = Array.isArray(acc.monthly_expenses) ? acc.monthly_expenses : [];
                        const m = expenses.find((me: any) => me && me.month === mn);
                        return m ? (parseFloat((m as any)[usageKey]) || 0) : 0;
                    });

                    const rowVals: any[] = [accountSeq, acc.account, acc.costcenter || 'N/A', ...monthlyValues];
                    const rowTotal = monthlyValues.reduce((s, v) => s + v, 0);
                    rowVals.push(rowTotal);

                    const row = worksheet.addRow(rowVals);

                    // format monthly and total cells as currency
                    const amountStartCol = 4; // after No, Account, Cost Center
                    const amountEndCol = amountStartCol + 11; // 12 months
                    for (let c = amountStartCol; c <= amountEndCol + 1; c++) {
                        const cell = row.getCell(c);
                        cell.numFmt = '#,##0.00';
                    }

                    // accumulate month totals for this detail row
                    monthlyValues.forEach((v, i) => {
                        monthTotals[i] = (monthTotals[i] || 0) + v;
                    });

                    accountSeq++;
                });

                // Add totals row for the section using computed monthTotals
                const totalsRowValues: any[] = ['', 'Total', '', ...monthTotals.map(v => v || 0)];
                const sectionTotal = monthTotals.reduce((s, v) => s + v, 0);
                totalsRowValues.push(sectionTotal);
                const totalsRowIndex = worksheet.addRow(totalsRowValues).number;
                const totalsRow = worksheet.getRow(totalsRowIndex);
                totalsRow.font = { bold: true };
                // format month total cells and final total
                const totalStartCol = 4;
                const totalEndCol = totalStartCol + 11;
                for (let c = totalStartCol; c <= totalEndCol + 1; c++) {
                    const cell = totalsRow.getCell(c);
                    cell.numFmt = '#,##0.00';
                }
            };

            // Build summary rows (sum of Color + B/W + Rent per month)
            json.data.forEach((yearBlock) => {
                yearBlock.details.forEach((acc) => {
                    const monthlyValues = monthOrder.map(mn => {
                        const expenses = Array.isArray(acc.monthly_expenses) ? acc.monthly_expenses : [];
                        const m = expenses.find((me: any) => me && me.month === mn);
                        if (!m) return 0;
                        const color = parseFloat((m as any).ubill_color) || 0;
                        const bw = parseFloat((m as any).ubill_bw) || 0;
                        const rent = parseFloat((m as any).ubill_rent) || 0;
                        return color + bw + rent;
                    });
                    const total = monthlyValues.reduce((s, v) => s + v, 0);
                    summaryRows.push({
                        year: yearBlock.year,
                        account: acc.account,
                        costcenter: acc.costcenter || 'N/A',
                        monthly: monthlyValues,
                        total
                    });
                });
            });

            // Summary sheet with single combined table
            const summarySheet = workbook.addWorksheet('Summary');
            summarySheet.addRow([`Printing Summary (All)`]);
            summarySheet.addRow([]);
            const summaryHeaders = ['No','Year','Account','Cost Center', ...monthOrder.map(m => m.slice(0,3)), 'Total'];
            summarySheet.addRow(summaryHeaders);
            const summaryHeaderRowIdx = summarySheet.lastRow ? summarySheet.lastRow.number : 3;
            const summaryHeaderRow = summarySheet.getRow(summaryHeaderRowIdx);
            summaryHeaderRow.font = { bold: true };
            summaryHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E7E6E6' } };

            const summaryMonthTotals: number[] = new Array(12).fill(0);
            summaryRows.forEach((row, idx) => {
                const rowVals: any[] = [idx + 1, row.year, row.account, row.costcenter || 'N/A', ...row.monthly, row.total];
                const added = summarySheet.addRow(rowVals);
                const amountStartCol = 5; // months start after No, Year, Account, Cost Center
                const amountEndCol = amountStartCol + 11;
                for (let c = amountStartCol; c <= amountEndCol + 1; c++) {
                    added.getCell(c).numFmt = '#,##0.00';
                }
                row.monthly.forEach((v, i) => {
                    summaryMonthTotals[i] = (summaryMonthTotals[i] || 0) + v;
                });
            });

            const summaryTotalsRowValues: any[] = ['', 'Total', '', '', ...summaryMonthTotals.map(v => v || 0)];
            const summarySectionTotal = summaryMonthTotals.reduce((s, v) => s + v, 0);
            summaryTotalsRowValues.push(summarySectionTotal);
            const summaryTotalsRowIdx = summarySheet.addRow(summaryTotalsRowValues).number;
            const summaryTotalsRow = summarySheet.getRow(summaryTotalsRowIdx);
            summaryTotalsRow.font = { bold: true };
            const summaryTotalStartCol = 5;
            const summaryTotalEndCol = summaryTotalStartCol + 11;
            for (let c = summaryTotalStartCol; c <= summaryTotalEndCol + 1; c++) {
                summaryTotalsRow.getCell(c).numFmt = '#,##0.00';
            }

            const summaryTotalColumns = 4 + monthOrder.length + 1; // No, Year, Account, Cost Center, 12 months, Total
            for (let colIndex = 1; colIndex <= summaryTotalColumns; colIndex++) {
                const column = summarySheet.getColumn(colIndex);
                let maxLength = 10;
                column.eachCell({ includeEmpty: false }, (cell) => {
                    const cellValue = cell.value?.toString() || '';
                    maxLength = Math.max(maxLength, cellValue.length);
                });
                if (colIndex === 1) {
                    column.width = 5;
                } else if (colIndex === 2) {
                    column.width = 8; // Year
                } else if (colIndex === 3) {
                    column.width = Math.max(maxLength + 2, 12); // Account
                } else if (colIndex === 4) {
                    column.width = Math.max(maxLength + 2, 14); // Cost Center
                } else {
                    column.width = Math.min(Math.max(maxLength + 2, 10), 15);
                }
            }

            // For each year block, create a worksheet with separate tables for Color, B/W, and Rental
            json.data.forEach((yearBlock) => {
                const sheetName = String(yearBlock.year);
                const worksheet = workbook.addWorksheet(sheetName);

                // Title rows
                const title = [`Printing Summary - ${yearBlock.year}`];
                worksheet.addRow(title);
                worksheet.addRow([]);

                const usageTables: { label: string; key: 'ubill_color' | 'ubill_bw' | 'ubill_rent' }[] = [
                    { label: 'Color', key: 'ubill_color' },
                    { label: 'B/W', key: 'ubill_bw' },
                    { label: 'Rental', key: 'ubill_rent' }
                ];

                usageTables.forEach((table, idx) => {
                    if (idx > 0) {
                        worksheet.addRow([]); // space between tables
                    }
                    addUsageTable(worksheet, yearBlock, table.label, table.key);
                });

                // Set column widths - ensure all columns are properly configured
                const totalColumns = 3 + monthOrder.length + 1; // No, Account, Cost Center, 12 months, Total
                for (let colIndex = 1; colIndex <= totalColumns; colIndex++) {
                    const column = worksheet.getColumn(colIndex);
                    column.hidden = false;
                    
                    // Calculate width based on content
                    let maxLength = 10;
                    column.eachCell({ includeEmpty: false }, (cell) => {
                        const cellValue = cell.value?.toString() || '';
                        maxLength = Math.max(maxLength, cellValue.length);
                    });
                    
                    // Set appropriate width
                    if (colIndex === 1) {
                        column.width = 5; // No
                    } else if (colIndex === 2) {
                        column.width = Math.max(maxLength + 2, 12); // Account
                    } else if (colIndex === 3) {
                        column.width = Math.max(maxLength + 2, 14); // Cost Center
                    } else {
                        column.width = Math.min(Math.max(maxLength + 2, 10), 15); // Months and Total
                    }
                }
                // no indent prefix columns used
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const fileUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = fileUrl;
            const now = new Date();
            const ts = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}${now.getSeconds().toString().padStart(2,'0')}`;
            link.download = `Printing-Summary-${ts}.xlsx`;
            link.click();
            window.URL.revokeObjectURL(fileUrl);

        } catch (err: any) {
            console.error('Failed to generate printing report', err);
            const msg = err?.message || String(err);
            const stack = err?.stack ? `\n${err.stack}` : '';
            alert(`Failed to generate printing report: ${msg}`);
            console.error(stack);
        } finally {
            setLoading(false);
        }
    };

    const today = new Date();
    const lastDayPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const maxDate = `${lastDayPrevMonth.getFullYear()}-${pad(lastDayPrevMonth.getMonth() + 1)}-${pad(lastDayPrevMonth.getDate())}`;

    return (
        <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
            <div className="flex items-center space-x-2">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                <h2 className="text-2xl font-bold">Printing Billing Report</h2>
            </div>
            <div className="text-sm text-yellow-700 bg-yellow-100 border-l-4 border-yellow-400 p-2 mb-4 rounded">
                <strong>Notice:</strong> The generated report is based on the statement month.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div>
                    <label className="block text-sm font-medium">Cost Center</label>
                    <SingleSelect
                        className="w-full"
                        options={[{ value: 'all', label: 'All Cost Centers' }, ...costCenters]}
                        value={selectedCostCenter}
                        onValueChange={(v) => setSelectedCostCenter(v || 'all')}
                        placeholder="All Cost Centers"
                        searchPlaceholder="Search cost center..."
                        clearable
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium">Start Date</label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} max={maxDate} />
                </div>

                <div>
                    <label className="block text-sm font-medium">End Date</label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} max={maxDate} />
                </div>

                {/* indent columns input removed */}

                <div className="col-span-2 md:col-span-1 mt-6.5 flex gap-2">
                    <Button
                        onClick={() => handleDownload()}
                        disabled={loading || !startDate || !endDate}
                        className="flex items-center gap-2"
                        title={!startDate || !endDate ? 'Select Start and End Date' : undefined}
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default PrintingExcelReport;
