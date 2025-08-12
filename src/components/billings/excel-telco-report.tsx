import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Download, FileSpreadsheet } from 'lucide-react';
import { Select, SelectTrigger, SelectContent, SelectGroup, SelectLabel, SelectItem, SelectValue } from '@/components/ui/select';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import ExcelJS from 'exceljs';

interface TelcoAccount {
    id: number;
    account_master: string;
    provider: string;
}

interface CostCenter {
    id: number;
    name: string;
}

const TelcoReport: React.FC<{ onExport: (params: any) => void }> = ({ onExport }) => {
    const [category, setCategory] = useState('Account');
    const [accountId, setAccountId] = useState('');
    const [costCenterId, setCostCenterId] = useState('');
    const [reportType, setReportType] = useState('Monthly');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [accounts, setAccounts] = useState<TelcoAccount[]>([]);
    const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        authenticatedApi.get('/api/telco/accounts')
            .then((response: any) => {
                const data = response.data?.data as TelcoAccount[];
                console.log('Telco accounts data:', data); // Debug log
                if (Array.isArray(data)) {
                    const processedAccounts = data.map(acc => ({
                        id: acc.id,
                        account_master: acc.account_master,
                        provider: acc.provider
                    }));
                    console.log('Processed accounts:', processedAccounts); // Debug log
                    setAccounts(processedAccounts);
                } else {
                    setAccounts([]);
                }
            })
            .catch(error => {
                console.error('Error fetching accounts:', error);
                setAccounts([]);
            });
        authenticatedApi.get('/api/assets/costcenters')
            .then((response: any) => {
                const data = response.data?.data as CostCenter[];
                if (Array.isArray(data)) {
                    setCostCenters(data.map(cc => ({
                        id: cc.id,
                        name: cc.name
                    })));
                } else {
                    setCostCenters([]);
                }
            })
            .catch(error => {
                console.error('Error fetching cost centers:', error);
                setCostCenters([]);
            });
    }, []);

    // Excel export logic
    const handleExport = async () => {
        if (category === 'Account' && accountId && reportType === 'Summary' && fromDate && toDate) {
            setLoading(true);
            try {
                const resp = await authenticatedApi.get(`/api/telco/bills/${accountId}/report/account?from=${fromDate}&to=${toDate}`);
                const report = resp.data as {
                    account?: { account_no?: string; provider?: string; description?: string };
                    data?: Array<{ year: number; month: Array<{ name: string; total_amount: string; costcenters: Array<{ id: number; name: string; amount: string }> }> }>;
                };
                // Pivot data: costcenter as row, year-month as column
                // 1. Collect all year-months
                const ymList: string[] = [];
                const costcenterMap: Record<string, { id: number; name: string }> = {};
                const amounts: Record<string, Record<string, number>> = {};
                if (report.data && Array.isArray(report.data)) {
                    report.data.forEach((yearObj) => {
                        yearObj.month.forEach((monthObj) => {
                            const ym = `${yearObj.year}-${monthObj.name}`;
                            if (!ymList.includes(ym)) ymList.push(ym);
                            if (monthObj.costcenters && Array.isArray(monthObj.costcenters)) {
                                monthObj.costcenters.forEach((cc) => {
                                    costcenterMap[cc.id] = { id: cc.id, name: cc.name };
                                    if (!amounts[cc.id]) amounts[cc.id] = {};
                                    amounts[cc.id][ym] = parseFloat(cc.amount) || 0;
                                });
                            }
                        });
                    });
                }
                ymList.sort((a, b) => {
                    // Sort by year then month
                    const [ay, am] = a.split('-');
                    const [by, bm] = b.split('-');
                    if (ay !== by) return Number(ay) - Number(by);
                    // Try to parse month name to order
                    const monthOrder = ["Jan'24", "Feb'24", "Mar'24", "Apr'24", "May'24", "Jun'24", "Jul'24", "Aug'24", "Sep'24", "Oct'24", "Nov'24", "Dec'24",
                        "Jan'25", "Feb'25", "Mar'25", "Apr'25", "May'25", "Jun'25", "Jul'25", "Aug'25", "Sep'25", "Oct'25", "Nov'25", "Dec'25"];
                    return monthOrder.indexOf(am) - monthOrder.indexOf(bm);
                });
                // 2. Prepare worksheet
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Telco Account Pivot');
                worksheet.addRow([`Telco Account Summary Pivot Report`]);
                worksheet.addRow([`Account: ${report.account?.account_no || ''}`]);
                worksheet.addRow([`Provider: ${report.account?.provider || ''}`]);
                worksheet.addRow([`Description: ${report.account?.description || ''}`]);
                worksheet.addRow([`Period: ${fromDate} to ${toDate}`]);
                worksheet.addRow([]); // Empty row
                // Build two-level header: first row is year (colspan), second row is month
                // 1. Build year->months map
                const yearMonthMap: Record<string, string[]> = {};
                ymList.forEach(ym => {
                    const [year, month] = ym.split('-');
                    if (!yearMonthMap[year]) yearMonthMap[year] = [];
                    yearMonthMap[year].push(month);
                });
                const years = Object.keys(yearMonthMap);
                // 2. First header row: 'Cost Center', then each year (colspan), then 'Sub-total'
                const header1 = ['Cost Center'];
                years.forEach(y => {
                    for (let i = 0; i < yearMonthMap[y].length; i++) {
                        header1.push(i === 0 ? y : '');
                    }
                });
                header1.push('Sub-total');
                const header1Row = worksheet.addRow(header1).number;
                const header2 = [''];
                years.forEach(y => {
                    yearMonthMap[y].forEach(m => header2.push(m));
                });
                header2.push('');
                const header2Row = worksheet.addRow(header2).number;
                // 4. Merge year cells for colspan
                let colIdx = 2;
                years.forEach(y => {
                    const months = yearMonthMap[y];
                    if (months.length > 1) {
                        worksheet.mergeCells(header1Row, colIdx, header1Row, colIdx + months.length - 1);
                    }
                    colIdx += months.length;
                });
                // Merge Cost Center and Sub-total cells vertically
                worksheet.mergeCells(header1Row, 1, header2Row, 1);
                worksheet.mergeCells(header1Row, header1.length, header2Row, header1.length);
                // Add borders to header rows
                for (let rowNum = header1Row; rowNum <= header2Row; rowNum++) {
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
                // 5. Data rows
                const tableStartRow = worksheet.lastRow ? worksheet.lastRow.number + 1 : 9;
                Object.values(costcenterMap).forEach(cc => {
                    const row: any[] = [cc.name];
                    let subtotal = 0;
                    years.forEach(y => {
                        yearMonthMap[y].forEach(m => {
                            const ym = `${y}-${m}`;
                            const val = amounts[cc.id]?.[ym] || 0;
                            row.push(val);
                            subtotal += val;
                        });
                    });
                    row.push(subtotal);
                    worksheet.addRow(row);
                });
                // Add borders to table
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
                worksheet.getRow(tableStartRow - 2).font = { bold: true };
                worksheet.getRow(tableStartRow - 1).font = { bold: true };
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
                const datetimeStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
                const filename = `telco-costcenter-summary-${accountId}-${datetimeStr}.xlsx`;
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
            } catch (err) {
                alert('Failed to export report.');
            }
            setLoading(false);
        } else if (category === 'Cost Center' && costCenterId && reportType === 'Summary' && fromDate && toDate) {
            setLoading(true);
            try {
                const resp = await authenticatedApi.get(`/api/telco/bills/${costCenterId}/report/costcenter?from=${fromDate}&to=${toDate}`);
                const report = resp.data as {
                    costcenter?: { id: number; name: string };
                    data?: Array<{ year: number; month: Array<{ name: string; total_amount: string; accounts: Array<{ id: number; account_no: string; description: string; provider: string; amount: string }> }> }>;
                };
                // Pivot data: account as row, year-month as column
                const ymList: string[] = [];
                const accountMap: Record<string, { id: number; account_no: string; description: string; provider: string }> = {};
                const amounts: Record<string, Record<string, number>> = {};
                if (report.data && Array.isArray(report.data)) {
                    report.data.forEach((yearObj) => {
                        yearObj.month.forEach((monthObj) => {
                            const ym = `${yearObj.year}-${monthObj.name}`;
                            if (!ymList.includes(ym)) ymList.push(ym);
                            if (monthObj.accounts && Array.isArray(monthObj.accounts)) {
                                monthObj.accounts.forEach((acc) => {
                                    accountMap[acc.id] = { id: acc.id, account_no: acc.account_no, description: acc.description, provider: acc.provider };
                                    if (!amounts[acc.id]) amounts[acc.id] = {};
                                    amounts[acc.id][ym] = parseFloat(acc.amount) || 0;
                                });
                            }
                        });
                    });
                }
                ymList.sort((a, b) => {
                    const [ay, am] = a.split('-');
                    const [by, bm] = b.split('-');
                    if (ay !== by) return Number(ay) - Number(by);
                    const monthOrder = ["Jan'24", "Feb'24", "Mar'24", "Apr'24", "May'24", "Jun'24", "Jul'24", "Aug'24", "Sep'24", "Oct'24", "Nov'24", "Dec'24",
                        "Jan'25", "Feb'25", "Mar'25", "Apr'25", "May'25", "Jun'25", "Jul'25", "Aug'25", "Sep'25", "Oct'25", "Nov'25", "Dec'25"];
                    return monthOrder.indexOf(am) - monthOrder.indexOf(bm);
                });
                // Prepare worksheet
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Telco CostCenter Pivot');
                worksheet.addRow([`Telco Cost Center Summary Pivot Report`]);
                worksheet.addRow([`Cost Center: ${report.costcenter?.name || ''}`]);
                worksheet.addRow([`Period: ${fromDate} to ${toDate}`]);
                worksheet.addRow([]);
                // Build two-level header: first row is year (colspan), second row is month
                const yearMonthMap: Record<string, string[]> = {};
                ymList.forEach(ym => {
                    const [year, month] = ym.split('-');
                    if (!yearMonthMap[year]) yearMonthMap[year] = [];
                    yearMonthMap[year].push(month);
                });
                const years = Object.keys(yearMonthMap);
                const header1 = ['Account No', 'Description', 'Provider'];
                years.forEach(y => {
                    for (let i = 0; i < yearMonthMap[y].length; i++) {
                        header1.push(i === 0 ? y : '');
                    }
                });
                header1.push('Sub-total');
                const header1Row = worksheet.addRow(header1).number;
                const header2 = ['', '', ''];
                years.forEach(y => {
                    yearMonthMap[y].forEach(m => header2.push(m));
                });
                header2.push('');
                const header2Row = worksheet.addRow(header2).number;
                // Merge year cells for colspan
                let colIdx = 4;
                years.forEach(y => {
                    const months = yearMonthMap[y];
                    if (months.length > 1) {
                        worksheet.mergeCells(header1Row, colIdx, header1Row, colIdx + months.length - 1);
                    }
                    colIdx += months.length;
                });
                // Merge Account No, Description, Provider, and Sub-total cells vertically
                worksheet.mergeCells(header1Row, 1, header2Row, 1);
                worksheet.mergeCells(header1Row, 2, header2Row, 2);
                worksheet.mergeCells(header1Row, 3, header2Row, 3);
                worksheet.mergeCells(header1Row, header1.length, header2Row, header1.length);
                // Add borders to header rows
                for (let rowNum = header1Row; rowNum <= header2Row; rowNum++) {
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
                // Data rows
                const tableStartRow = worksheet.lastRow ? worksheet.lastRow.number + 1 : 9;
                Object.values(accountMap).forEach(acc => {
                    const row: any[] = [acc.account_no, acc.description, acc.provider];
                    let subtotal = 0;
                    years.forEach(y => {
                        yearMonthMap[y].forEach(m => {
                            const ym = `${y}-${m}`;
                            const val = amounts[acc.id]?.[ym] || 0;
                            row.push(val);
                            subtotal += val;
                        });
                    });
                    row.push(subtotal);
                    worksheet.addRow(row);
                });
                // Add borders to table
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
                worksheet.getRow(tableStartRow - 2).font = { bold: true };
                worksheet.getRow(tableStartRow - 1).font = { bold: true };
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
                const datetimeStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
                const filename = `telco-account-summary-by-costcenter-${costCenterId}-${datetimeStr}.xlsx`;
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
            } catch (err) {
                alert('Failed to export report.');
            }
            setLoading(false);
        } else {
            // fallback to parent handler for other cases
            onExport({ category, accountId, costCenterId, reportType, fromDate, toDate });
        }
    };
    return (
        <div className='space-y-4 p-4 border rounded-lg bg-gray-50'>
            <div className="flex items-center space-x-2">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                <h2 className="text-2xl font-bold">Telco Billing Report</h2>
            </div>
            <div className="text-sm text-yellow-700 bg-yellow-100 border-l-4 border-yellow-400 p-2 mb-4 rounded">
                <strong>Notice:</strong> The generated report is based on the statement month. Fuel consumption bills are typically received in the following month.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
                <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>Report Type</label>
                    <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className='w-full' >
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectLabel>Category</SelectLabel>
                                <SelectItem value="Account">By Account</SelectItem>
                                <SelectItem value="Cost Center">By Cost Center</SelectItem>
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>Account</label>
                    <Combobox
                        options={accounts.map(acc => {
                            const label = `${acc.account_master || ''} - ${acc.provider || ''}`.trim();
                            console.log(`Account ${acc.id}: "${label}"`); // Debug each account
                            return {
                                value: String(acc.id),
                                label: label
                            };
                        })}
                        value={accountId}
                        onValueChange={(value) => {
                            console.log('Account selected:', value); // Debug selection
                            setAccountId(value);
                        }}
                        placeholder="Select Account..."
                        searchPlaceholder="Search accounts..."
                        emptyMessage="No account found."
                        disabled={category !== 'Account'}
                        className="w-full"
                        clearable={true}
                    />
                </div>

                <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>Cost Center</label>
                    <Combobox
                        options={costCenters.map(cc => ({
                            value: String(cc.id),
                            label: cc.name
                        }))}
                        value={costCenterId}
                        onValueChange={setCostCenterId}
                        placeholder="Select Cost Center..."
                        searchPlaceholder="Search cost centers..."
                        emptyMessage="No cost center found."
                        disabled={category !== 'Cost Center'}
                        className="w-full"
                        clearable={true}
                    />
                </div>

                <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>Report Type</label>
                    <Select value={reportType} onValueChange={setReportType}>
                        <SelectTrigger className='w-full'>
                            <SelectValue placeholder="Report Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectLabel>Report Type</SelectLabel>
                                <SelectItem value="Monthly">Monthly</SelectItem>
                                <SelectItem value="Summary">Summary</SelectItem>
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>Start Date</label>
                    <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} placeholder="From" />
                </div>
                <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>End Date</label>
                    <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} placeholder="To" />
                </div>
                <div className='flex'>
                    <Button onClick={handleExport} className="ml-2" disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}
                    </Button>
                </div>

            </div>
        </div>

    );
};

export default TelcoReport;
