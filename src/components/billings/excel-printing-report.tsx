import React, { useState, useEffect } from 'react';
import { authenticatedApi } from '@/config/api';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ExcelJS from 'exceljs';

interface MonthlyExpense {
    month: string;
    util_id: number;
    ubill_date: string;
    ubill_rent: string;
    ubill_color: string;
    ubill_bw: string;
    ubill_gtotal: string;
}

interface AccountDetail {
    bill_id: number;
    account: string;
    total_monthly: string;
    monthly_expenses: MonthlyExpense[];
}

interface YearBlock {
    year: number;
    total_annual: string;
    details: { account: AccountDetail }[];
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
    const [costCenters, setCostCenters] = useState<{ id: string; name: string }[]>([]);
    const [selectedCostCenter, setSelectedCostCenter] = useState<string>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        authenticatedApi.get('/api/assets/costcenters').then((res: any) => {
            if (Array.isArray(res.data?.data)) {
                setCostCenters(res.data.data.map((cc: any) => ({ id: cc.id?.toString() || '', name: cc.name || '' })));
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

            const debugRows: string[][] = [];
            // For each year block, create a worksheet
            json.data.forEach((yearBlock) => {
                const sheetName = String(yearBlock.year);
                const worksheet = workbook.addWorksheet(sheetName);

                // Title rows
                const title = [`Printing Summary - ${yearBlock.year}`];
                worksheet.addRow(title);
                worksheet.addRow([]);

                // Build explicit two-row header so column indices are deterministic
                const baseHeadersTop = ['No','Account', 'Details', ...monthOrder, 'Total'];
                const baseHeadersBottom = ['', '', '', ...monthOrder.map(m => m.slice(0,3)), ''];

                worksheet.addRow(baseHeadersTop);
                const header1Index = worksheet.lastRow ? worksheet.lastRow.number : 1;
                worksheet.addRow(baseHeadersBottom);
                const header2Index = worksheet.lastRow ? worksheet.lastRow.number : header1Index + 1;
                // style top header
                const headerRowTop = worksheet.getRow(header1Index);
                headerRowTop.font = { bold: true };
                headerRowTop.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E7E6E6' } };
                worksheet.getRow(header2Index).font = { bold: true };

                // Process each account detail - expand into three rows per account: Rental, Color, B/W
                // Prepare month totals accumulator for the year
                const monthTotals: number[] = new Array(12).fill(0);

                let accountSeq = 1;
                yearBlock.details.forEach((detailObj) => {
                    // support two possible shapes returned by API:
                    // 1) details: [{ account: AccountDetail }, ...]
                    // 2) details: [AccountDetail, ...]
                    const acc: any = (detailObj && (detailObj as any).account) ? (detailObj as any).account : detailObj;
                    if (!acc) return; // defensive

                    // capture starting row for merging account cell vertically
                    const firstRowNumber = worksheet.lastRow ? worksheet.lastRow.number + 1 : header2Index + 1;

                    const detailTypes: { key: 'ubill_rent' | 'ubill_color' | 'ubill_bw'; label: string }[] = [
                        { key: 'ubill_rent', label: 'Rental' },
                        { key: 'ubill_color', label: 'Color' },
                        { key: 'ubill_bw', label: 'B/W' }
                    ];

                    const rowNums: number[] = [];
                    detailTypes.forEach((dt, idx) => {
                        // build monthly values for this detail type
                        const monthlyValues = monthOrder.map(mn => {
                            const expenses = Array.isArray(acc.monthly_expenses) ? acc.monthly_expenses : [];
                            const m = expenses.find((me: any) => me && me.month === mn);
                            return m ? (parseFloat((m as any)[dt.key]) || 0) : 0;
                        });

                        const rowVals: any[] = [];
                        // Only write number and account on first of the three rows; we'll style the first cells
                        rowVals.push(idx === 0 ? accountSeq : '');
                        rowVals.push(idx === 0 ? acc.account : '');
                        rowVals.push(dt.label);
                        monthlyValues.forEach(v => rowVals.push(v));
                        const rowTotal = monthlyValues.reduce((s, v) => s + v, 0);
                        rowVals.push(rowTotal);

                        const row = worksheet.addRow(rowVals);
                        rowNums.push(row.number);

                        // format monthly and total cells as currency
                        const amountStartCol = 4; // after No, Account and Details
                        const amountEndCol = amountStartCol + 11; // 12 months
                        for (let c = amountStartCol; c <= amountEndCol + 1; c++) {
                            const cell = row.getCell(c);
                            cell.numFmt = '#,##0.00';
                        }

                        // accumulate month totals for this detail row
                        monthlyValues.forEach((v, i) => {
                            monthTotals[i] = (monthTotals[i] || 0) + v;
                        });
                    });

                    // Do not merge cells; instead style the No and Account cells on the first detail row
                    const noCol = 1;
                    const accountCol = 2;
                    try {
                        const firstNoCell = worksheet.getCell(rowNums[0], noCol);
                        firstNoCell.alignment = { vertical: 'middle', horizontal: 'center' };
                        firstNoCell.font = { bold: true };
                    } catch (e) {
                        // ignore
                    }
                    try {
                        const firstAccCell = worksheet.getCell(rowNums[0], accountCol);
                        firstAccCell.alignment = { vertical: 'middle', horizontal: 'left' };
                        firstAccCell.font = { bold: true };
                    } catch (e) {
                        // ignore
                    }
                    accountSeq++;
                });

                // Add totals row for the year using computed monthTotals
                const totalsRowValues: any[] = ['', '', 'Total', ...monthTotals.map(v => v || 0), parseFloat(yearBlock.total_annual) || 0];
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

                // Auto-fit columns
                worksheet.columns.forEach((column) => {
                    if (column.values) {
                        const maxLength = Math.max(...column.values.map((v: any) => v ? v.toString().length : 0));
                        column.width = Math.min(maxLength + 2, 40);
                    }
                });
                // no indent prefix columns used

                // Debug info for this sheet: header lengths and sample row cell counts
                try {
                    const firstDataRowNum = header2Index + 1;
                    const lastRowNum = worksheet.lastRow ? worksheet.lastRow.number : firstDataRowNum - 1;
                    const firstDataRow = worksheet.getRow(firstDataRowNum);
                    const firstDataCount = firstDataRow ? firstDataRow.cellCount || 0 : 0;
                    const totalsRow = worksheet.getRow(lastRowNum);
                    const totalsCount = totalsRow ? totalsRow.cellCount || 0 : 0;
                    debugRows.push(['Sheet', sheetName]);
                    debugRows.push(['headerTopLength', String(baseHeadersTop.length)]);
                    debugRows.push(['headerBottomLength', String(baseHeadersBottom.length)]);
                    debugRows.push(['firstDataRowNum', String(firstDataRowNum)]);
                    debugRows.push(['firstDataCellCount', String(firstDataCount)]);
                    debugRows.push(['lastRowNum', String(lastRowNum)]);
                    debugRows.push(['totalsRowCellCount', String(totalsCount)]);
                    debugRows.push([]);
                } catch (e) {
                    // ignore
                }
            });

            // append DEBUG sheet with the collected diagnostics
            if (debugRows.length) {
                const dbg = workbook.addWorksheet('DEBUG');
                debugRows.forEach(r => dbg.addRow(r));
            }

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
                    <Select value={selectedCostCenter} onValueChange={setSelectedCostCenter}>
                        <SelectTrigger className='w-full'>
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
                    <Button onClick={() => handleDownload()} disabled={loading} className="flex items-center gap-2">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                    </Button>
                    <Button onClick={() => handleDownload({
                        status: 'success', message: 'mock', data: [
                            {
                                year: 2025,
                                total_annual: '4057.55',
                                details: [
                                    { account: { bill_id: 275, account: '45105231', monthly_expenses: [ { month: 'January', ubill_rent: '650.00', ubill_color: '485.15', ubill_bw: '50.46' }, { month: 'February', ubill_rent: '650.00', ubill_color: '284.16', ubill_bw: '26.71' } ] } },
                                    { account: { bill_id: 260, account: '2506127Y', monthly_expenses: [ { month: 'January', ubill_rent: '650.00', ubill_color: '196.23', ubill_bw: '53.75' }, { month: 'February', ubill_rent: '650.00', ubill_color: '306.91', ubill_bw: '54.18' } ] } }
                                ]
                            }
                        ]
                    } as ApiResponse)}>
                        Test Export
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default PrintingExcelReport;
