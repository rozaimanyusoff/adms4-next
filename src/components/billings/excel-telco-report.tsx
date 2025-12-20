import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, FileSpreadsheet } from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';
import ExcelJS from 'exceljs';

interface TelcoAccount {
    id: number;
    account_master: string;
    provider: string;
    account_no?: string;
    description?: string;
}

interface CostCenter {
    id: number;
    name: string;
}

const TelcoReport: React.FC<{ onExport: (params: any) => void }> = ({ onExport }) => {
    const [accountIds, setAccountIds] = useState<string[]>([]);
    const [costCenterIds, setCostCenterIds] = useState<string[]>([]);
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
                        provider: acc.provider,
                        account_no: (acc as any).account_no,
                        description: (acc as any).description
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
        if (!fromDate || !toDate) {
            onExport({ accountIds, costCenterIds, fromDate, toDate });
            return;
        }
        setLoading(true);
        try {
            const params = new URLSearchParams();
            accountIds.forEach(id => params.append('account', id));
            costCenterIds.forEach(id => params.append('cc', id));
            params.append('from', fromDate);
            params.append('to', toDate);
            const resp = await authenticatedApi.get<{ data: Array<{ costcenter?: { id: number; name: string }; data?: Array<{ year: number; month: Array<{ name: string; total_amount: string; accounts: Array<{ id?: number; account_id?: number; account_no: string; description: string; provider: string; amount: string }> }> }>; from_date?: string; to_date?: string; }> }>(`/api/telco/bills/report/costcenter?${params.toString()}`);
            const reportData = Array.isArray(resp.data?.data) ? resp.data.data as Array<{
                costcenter?: { id: number; name: string };
                data?: Array<{ year: number; month: Array<{ name: string; total_amount: string; accounts: Array<{ id?: number; account_id?: number; account_no: string; description: string; provider: string; amount: string }> }> }>;
                from_date?: string;
                to_date?: string;
            }> : [];

            // Pivot data: account per cost center as row, year-month as column
            const ymList: string[] = [];
            const rowMap: Record<string, { costcenter: string; account_no: string; description: string; provider: string }> = {};
            const amounts: Record<string, Record<string, number>> = {};
            reportData.forEach((ccGroup) => {
                const ccName = ccGroup.costcenter?.name || 'N/A';
                if (!Array.isArray(ccGroup.data)) return;
                ccGroup.data.forEach((yearObj) => {
                    const months = Array.isArray(yearObj.month) ? yearObj.month : [];
                    months.forEach((monthObj) => {
                        const ym = `${yearObj.year}-${monthObj.name}`;
                        if (!ymList.includes(ym)) ymList.push(ym);
                        const accountsArr = Array.isArray(monthObj.accounts) ? monthObj.accounts : [];
                        accountsArr.forEach((acc) => {
                            const accId = String(acc.id ?? acc.account_id ?? acc.account_no ?? Math.random());
                            const key = `${ccName}-${accId}`;
                            if (!rowMap[key]) {
                                rowMap[key] = {
                                    costcenter: ccName,
                                    account_no: acc.account_no || '',
                                    description: acc.description || '',
                                    provider: acc.provider || ''
                                };
                            }
                            if (!amounts[key]) amounts[key] = {};
                            amounts[key][ym] = (amounts[key][ym] || 0) + (parseFloat(acc.amount) || 0);
                        });
                    });
                });
            });
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

            const selectedCostCenterNames = costCenters
                .filter(cc => costCenterIds.includes(String(cc.id)))
                .map(cc => cc.name)
                .join(', ');
            const selectedAccountLabels = accounts
                .filter(acc => accountIds.includes(String(acc.id)))
                .map(acc => {
                    const base = acc.account_master || acc.account_no || '';
                    return `${base} ${acc.provider ? `(${acc.provider})` : ''}`.trim();
                })
                .join(', ');

            worksheet.addRow([`Telco Cost Center Summary Pivot Report`]);
            worksheet.addRow([`Cost Center: ${selectedCostCenterNames || 'All'}`]);
            worksheet.addRow([`Account: ${selectedAccountLabels || 'All'}`]);
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
            const header1 = ['Cost Center', 'Account No', 'Description', 'Provider'];
            years.forEach(y => {
                for (let i = 0; i < yearMonthMap[y].length; i++) {
                    header1.push(i === 0 ? y : '');
                }
            });
            header1.push('Sub-total');
            const header1Row = worksheet.addRow(header1).number;
            const header2 = ['', '', '', ''];
            years.forEach(y => {
                yearMonthMap[y].forEach(m => header2.push(m));
            });
            header2.push('');
            const header2Row = worksheet.addRow(header2).number;
            const orderedMonths: string[] = [];
            years.forEach(y => {
                yearMonthMap[y].forEach(m => orderedMonths.push(`${y}-${m}`));
            });
            // Merge year cells for colspan
            let colIdx = 5;
            years.forEach(y => {
                const months = yearMonthMap[y];
                if (months.length > 1) {
                    worksheet.mergeCells(header1Row, colIdx, header1Row, colIdx + months.length - 1);
                }
                colIdx += months.length;
            });
            // Merge fixed columns vertically
            worksheet.mergeCells(header1Row, 1, header2Row, 1);
            worksheet.mergeCells(header1Row, 2, header2Row, 2);
            worksheet.mergeCells(header1Row, 3, header2Row, 3);
            worksheet.mergeCells(header1Row, 4, header2Row, 4);
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
            Object.entries(rowMap).forEach(([key, acc]) => {
                const row: any[] = [acc.costcenter, acc.account_no, acc.description, acc.provider];
                let subtotal = 0;
                years.forEach(y => {
                    yearMonthMap[y].forEach(m => {
                        const ym = `${y}-${m}`;
                        const val = amounts[key]?.[ym] || 0;
                        row.push(val);
                        subtotal += val;
                    });
                });
                row.push(subtotal);
                worksheet.addRow(row);
            });
            // Totals row
            if (orderedMonths.length) {
                const totalsRow: any[] = ['Total', '', '', ''];
                let grandTotal = 0;
                orderedMonths.forEach(ym => {
                    const colTotal = Object.values(amounts).reduce((sum, row) => sum + (row?.[ym] || 0), 0);
                    totalsRow.push(colTotal);
                    grandTotal += colTotal;
                });
                totalsRow.push(grandTotal);
                worksheet.addRow(totalsRow);
                const totalsRowNumber = worksheet.lastRow?.number;
                if (totalsRowNumber) {
                    worksheet.getRow(totalsRowNumber).font = { bold: true };
                }
            }
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
                // Format numeric columns with thousand separators and 2 decimals
                const numericStartCol = 5; // first month column
                const numericEndCol = header1.length; // includes subtotal
                for (let col = numericStartCol; col <= numericEndCol; col++) {
                    const cell = row.getCell(col);
                    if (typeof cell.value === 'number') {
                        cell.numFmt = '#,##0.00';
                    }
                }
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
            const datetimeStr = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
            const filename = `telco-account-summary-by-costcenter-${datetimeStr}.xlsx`;
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>Account</label>
                    <Combobox
                        multiple
                        options={accounts.map(acc => {
                            const label = `${acc.account_master || ''} - ${acc.provider || ''}`.trim();
                            console.log(`Account ${acc.id}: "${label}"`); // Debug each account
                            return {
                                value: String(acc.id),
                                label: label
                            };
                        })}
                        value={accountIds}
                        onValueChange={(value) => {
                            console.log('Accounts selected:', value); // Debug selection
                            setAccountIds(value);
                        }}
                        placeholder="Select Account(s)..."
                        searchPlaceholder="Search accounts..."
                        emptyMessage="No account found."
                        className="w-full"
                        clearable={true}
                    />
                </div>

                <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>Cost Center</label>
                    <Combobox
                        multiple
                        options={costCenters.map(cc => ({
                            value: String(cc.id),
                            label: cc.name
                        }))}
                        value={costCenterIds}
                        onValueChange={setCostCenterIds}
                        placeholder="Select Cost Center(s)..."
                        searchPlaceholder="Search cost centers..."
                        emptyMessage="No cost center found."
                        className="w-full"
                        clearable={true}
                    />
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
