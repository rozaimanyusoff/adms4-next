// Batch export: Generate a single PDF for multiple telco bills
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { authenticatedApi } from '@/config/api';


export async function exportUtilityBillSummary(beneficiaryId: string | number | null, utilIds: number[]) {
    if (!utilIds || utilIds.length === 0) return;
    function formatDate(dateInput: string | Date | undefined): string {
        if (!dateInput) return '';
        const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1);
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }
    try {
        // Fetch all bills in one request, optionally scoped by beneficiary
        const endpoint = `/api/bills/util/by-ids/${beneficiaryId}`;
        const res = await authenticatedApi.post(endpoint,
            JSON.stringify({ ids: utilIds }),
            { headers: { 'Content-Type': 'application/json' } }
        ) as { data: { data: any[] } };
        const responseData = (res as any)?.data || {};
        const bills = responseData.data || [];
        // The API may return beneficiary either as an object or wrapped
        let responseBeneficiary = responseData.beneficiary || null;
        // Some endpoints return { beneficiary: { beneficiary: { ... } } }
        if (responseBeneficiary && (responseBeneficiary as any).beneficiary) {
            responseBeneficiary = (responseBeneficiary as any).beneficiary;
        }
        // Diagnostic: log and show brief toast so runtime shape can be confirmed
        try {
            // eslint-disable-next-line no-console
            console.log('exportUtilityBillSummary: responseBeneficiary ->', responseBeneficiary);
            if (!responseBeneficiary) {
                toast.error('Export: beneficiary missing in API response (check console)');
            } else {
                toast.success(`Export: beneficiary -> ${responseBeneficiary.entry_by?.full_name || responseBeneficiary.name}`);
            }
        } catch (e) { }
        if (bills.length === 0) {
            toast.error('No bill data found for selected bills.');
            return;
        }
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        // Add logo if available (top right)
        const logoUrl = process.env.NEXT_PUBLIC_BRAND_LOGO_LIGHT;
        if (logoUrl) {
            try {
                const response = await fetch(logoUrl);
                const blob = await response.blob();
                const reader = new FileReader();
                const base64Promise = new Promise<string>((resolve, reject) => {
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                });
                reader.readAsDataURL(blob);
                const base64 = await base64Promise;
                doc.addImage(base64, 'PNG', pageWidth - 32, 14, 18, 28);
            } catch (e) { }
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('M E M O', pageWidth / 15, 24, { align: 'left' });
        doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    // include the utilId(s) passed to the exporter; fall back to first bill id or 'N/A'
    const refUtil = (Array.isArray(utilIds) && utilIds.length) ? String(utilIds[0]) : (bills[0]?.id ? String(bills[0].id) : 'N/A');
    doc.text(`Our Ref : ${responseBeneficiary?.filing || 'Undefined reference'} (${refUtil})`, 15, 34);
        const currentDate = new Date();
        doc.text(`Date : ${formatDate(currentDate)}`, pageWidth - 70, 34, { align: 'right' });
        doc.text('To      : Head of Finance', 15, 44);
        doc.text('Of      : Ranhill Technologies Sdn Bhd', pageWidth - 95, 44, { align: 'left' });
        doc.text('Copy  :', 15, 48);
        doc.text('Of      :', pageWidth - 95, 48, { align: 'left' });
        doc.text(`From  : Human Resource and Administration`, 15, 52);
        doc.text('Of      : Ranhill Technologies Sdn Bhd', pageWidth - 95, 52, { align: 'left' });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        // Use the month/year of the first bill, or 'Batch' if mixed
        let billMonthYear = '';
        if (bills.length === 1 && bills[0].bill_date) {
            const billDate = new Date(bills[0].bill_date);
            billMonthYear = billDate.toLocaleString(undefined, { month: 'long', year: 'numeric' });
        } else if (bills.length > 1) {
            billMonthYear = 'Batch';
        }
        doc.text(`UTILITY BILLS - ${billMonthYear}`, 15, 64);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        // If the API returned a beneficiary wrapper, use its name in the memo
        const memoBeneficiaryName = responseBeneficiary?.name || '';
        if (memoBeneficiaryName) {
            doc.text(`Kindly please make a payment to ${memoBeneficiaryName} as follows:`, 15, 70);
        } else {
            doc.text(`Kindly please make a payment to the following beneficiaries as follows:`, 15, 70);
        }
        let y = 75;
        const tableHeaderRow = [
            'No', 'Account No', 'Date', 'Bill/Inv No', 'Beneficiary', 'Cost Center', 'Total (RM)'
        ];
        let rowNum = 1;
        const tableBody = [
            tableHeaderRow,
            ...bills.map((bill: any) => {
                return [
                    String(rowNum++),
                    bill.account?.account_no || '',
                    bill.ubill_date ? formatDate(bill.ubill_date) : '',
                    bill.ubill_no || '',
                    // Prefer per-account beneficiary name; fall back to response-level beneficiary
                    bill.account?.beneficiary?.name || responseBeneficiary?.name || '',
                    bill.account?.costcenter?.name || '-',
                    Number(bill.ubill_gtotal).toLocaleString(undefined, { minimumFractionDigits: 2 }),
                ];
            })
        ];
        autoTable(doc, {
            startY: y,
            head: [],
            body: tableBody,
            styles: { font: 'helvetica', fontSize: 9, cellPadding: 1 },
            didParseCell: function (data: any) {
                if (data.row.index === 0) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [255, 255, 255];
                    data.cell.styles.textColor = [0, 0, 0];
                }
            },
            didDrawCell: function (data: any) {
                if (data.row.index === 0) {
                    const { cell } = data;
                    const doc = data.doc;
                    doc.setDrawColor(200);
                    doc.setLineWidth(0.1);
                    doc.rect(cell.x, cell.y, cell.width, cell.height);
                }
            },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 35, halign: 'center' },
                2: { cellWidth: 23, halign: 'center' },
                3: { cellWidth: 35, halign: 'center' },
                4: { cellWidth: 27, halign: 'center' },
                5: { cellWidth: 26, halign: 'center' },
                6: { cellWidth: 25, halign: 'right' },
            },
            margin: { left: 14, right: 14 },
            tableWidth: 'auto',
            theme: 'grid',
        });
        y = (doc as any).lastAutoTable.finalY + 4;
        // Calculate totals for all selected bills
        const subtotal = bills.reduce((sum: number, bill: any) => sum + Number(bill.subtotal || 0), 0);
        const totalTax = bills.reduce((sum: number, bill: any) => sum + Number(bill.tax || 0), 0);
        const totalRounding = bills.reduce((sum: number, bill: any) => sum + Number(bill.rounding || 0), 0);
        const grandTotal = bills.reduce((sum: number, bill: any) => sum + Number(bill.ubill_gtotal || 0), 0);
        const subtotalLabel = 'Subtotal (RM):';
        const subtotalValue = subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 });
        const taxLabel = 'Tax (RM):';
        const totalTaxValue = totalTax.toLocaleString(undefined, { minimumFractionDigits: 2 });
        const roundLabel = 'Rounding (RM):';
        const roundValue = totalRounding.toLocaleString(undefined, { minimumFractionDigits: 2 });
        const grandTotalLabel = 'Grand Total:';
        const grandTotalValue = grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 });
        const colWidths = [10, 35, 23, 35, 27, 26, 25];
        const totalTableWidth = colWidths.reduce((a, b) => a + b, 0);
        const xStart = 14;
        const rowHeight = 6;
        /* doc.setFillColor(255,255,255);
        doc.setDrawColor(200);
        doc.setLineWidth(0.1);
        doc.rect(xStart, y - 4, totalTableWidth, rowHeight, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(subtotalLabel, xStart + totalTableWidth - 28, y, { align: 'right' });
        doc.text(subtotalValue, xStart + totalTableWidth - 1, y, { align: 'right' });
        y += rowHeight; */
        /* doc.setFillColor(255,255,255);
        doc.setDrawColor(200);
        doc.setLineWidth(0.1);
        doc.rect(xStart, y - 4, totalTableWidth, rowHeight, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(taxLabel, xStart + totalTableWidth - 28, y, { align: 'right' });
        doc.text(totalTaxValue, xStart + totalTableWidth - 1, y, { align: 'right' });
        y += rowHeight; */
        /* doc.setFillColor(255,255,255);
        doc.setDrawColor(200);
        doc.setLineWidth(0.1);
        doc.rect(xStart, y - 4, totalTableWidth, rowHeight, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(roundLabel, xStart + totalTableWidth - 28, y, { align: 'right' });
        doc.text(roundValue, xStart + totalTableWidth - 1, y, { align: 'right' });
        y += rowHeight; */
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(200);
        doc.setLineWidth(0.1);
        doc.rect(xStart, y - 4, totalTableWidth, rowHeight, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(grandTotalLabel, xStart + totalTableWidth - 28, y, { align: 'right' });
        doc.text(grandTotalValue, xStart + totalTableWidth - 1, y, { align: 'right' });
        y += 10;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('Your cooperation on the above is highly appreciated.', 15, y);
        y += 15;
        doc.setFont('helvetica', 'bold');
        doc.text('Ranhill Technologies Sdn. Bhd.', 15, y);
        y += 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('Prepared by,', 15, y);
        doc.text('Checked by,', pageWidth / 2 - 28, y);
        doc.text('Approved by,', pageWidth - 73, y);
        y += 15;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        const signatures = [
            {
                name: responseBeneficiary?.entry_by?.full_name || 'NOR AFFISHA NAJEEHA BT AFFIDIN',
                title: responseBeneficiary?.entry_position || 'Admin Assistant',
                x: 15
            },
            { name: 'MUHAMMAD ARIF BIN ABDUL JALIL', title: 'Senior Executive Administration', x: pageWidth / 2 - 28 },
            { name: 'KAMARIAH BINTI YUSOF', title: 'Head of Human Resources and Administration', x: pageWidth - 73 }
        ];
        signatures.forEach(sig => {
            doc.text(String(sig.name || '').toUpperCase(), sig.x, y);
        });
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        signatures.forEach(sig => {
            doc.text(sig.title, sig.x, y);
        });
        signatures.forEach(sig => {
            doc.text(String(sig.title || ''), sig.x, y);
        });
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('Date:', 15, y);
        doc.text('Date:', pageWidth / 2 - 28, y);
        doc.text('Date:', pageWidth - 73, y);
        y += 10;

        // Previous 5 bills trend table (if available per account)
        try {
            // Build account -> meta + previous_5_bills map
            const accountPrevMap = new Map<string, { arr: any[]; currentUbillNo?: string; costcenter?: string; location?: string }>();
            bills.forEach((b: any) => {
                const acct = b?.account?.account_no;
                if (!acct) return;
                const meta = {
                    arr: Array.isArray(b?.previous_5_bills) ? [...b.previous_5_bills] : [],
                    currentUbillNo: b?.ubill_no,
                    costcenter: b?.account?.costcenter?.name,
                    location: b?.account?.location?.name,
                };
                if (meta.arr.length) accountPrevMap.set(acct, meta);
            });

            if (accountPrevMap.size) {
                // Header label
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.text('Previous month bill status:', 15, y);
                y += 4;

                // Sorting helpers for months like 'Jul-2025'
                const monthIdx: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
                const parseMonthKey = (m?: string): number => {
                    if (!m) return 0;
                    const [mon, yr] = String(m).split('-');
                    const yNum = Number(yr || 0);
                    const mNum = monthIdx[mon as keyof typeof monthIdx] ?? 0;
                    return yNum * 12 + mNum;
                };
                const fmtHeaderMonth = (m?: string) => {
                    if (!m) return '';
                    const [mon, yr] = String(m).split('-');
                    return `${mon}\'${String(yr || '').slice(-2)}`;
                };

                // Collect union of months across accounts, sort earliest -> latest, keep up to 5
                const monthSet = new Set<string>();
                accountPrevMap.forEach(({ arr }) => arr.forEach(pb => pb?.month && monthSet.add(pb.month)));
                const monthsSorted = Array.from(monthSet).sort((a, b) => parseMonthKey(a) - parseMonthKey(b)).slice(-5);

                // Build table rows
                const headRow = ['No', 'Account No', ...monthsSorted.map(m => fmtHeaderMonth(m))];
                const bodyRows: any[] = [];
                let idxCounter = 1;
                // helper to format trending with thousands separators and sign
                const formatTrend = (v: any): string => {
                    if (v === null || v === undefined || v === '') return '';
                    const s = String(v).trim();
                    const hasExplicitSign = s.startsWith('+') || s.startsWith('-');
                    const sign = s.startsWith('-') ? '-' : (s.startsWith('+') ? '+' : '');
                    const num = Number(s.replace(/[,+]/g, ''));
                    if (!Number.isFinite(num)) return s; // fallback to raw if unparseable
                    const absFmt = Math.abs(num).toLocaleString(undefined, { minimumFractionDigits: 2 });
                    return hasExplicitSign ? `${sign}${absFmt}` : absFmt;
                };

                accountPrevMap.forEach((meta, acct) => {
                    const byMonth = new Map<string, any>(meta.arr.map(pb => [pb.month, pb]));
                    const suffix = meta.costcenter && meta.location
                        ? ` (${meta.costcenter} - ${meta.location})`
                        : meta.costcenter
                            ? ` (${meta.costcenter})`
                            : meta.location
                                ? ` (${meta.location})`
                                : '';
                    const acctWithCc = `${acct}${suffix}`;
                    const row: any[] = [String(idxCounter++), acctWithCc];
                    monthsSorted.forEach(m => {
                        const pb = byMonth.get(m);
                        if (!pb) {
                            row.push('-');
                            return;
                        }
                        const amt = Number(pb.ubill_gtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
                        const trendVal = formatTrend(pb.trending);
                        const trend = trendVal ? ` (${trendVal})` : '';
                        const billLine = pb.ubill_no ? `\n(${pb.ubill_no})` : '';
                        row.push(`RM ${amt}${trend}${billLine}`);
                    });
                    bodyRows.push(row);
                });

                // Render compact grid with font size 7
                autoTable(doc, {
                    startY: y,
                    head: [headRow],
                    body: bodyRows,
                    styles: { font: 'helvetica', fontSize: 7, cellPadding: 1, halign: 'center' },
                    headStyles: { fontStyle: 'bold', fillColor: [240, 240, 240], textColor: [0, 0, 0] },
                    columnStyles: {
                        0: { halign: 'center', cellWidth: 10 },
                        1: { halign: 'left', cellWidth: 65 },
                    },
                    margin: { left: 14, right: 14 },
                    theme: 'grid',
                });
                y = (doc as any).lastAutoTable.finalY + 4;
            }
        } catch (e) {
            // no-op if structure not present
        }
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.text('This document is generated by ADMS4', pageWidth / 2, pageHeight - 35, { align: 'center' });
        const footerLogoUrl = process.env.NEXT_PUBLIC_REPORT_FOOTER_LOGO;
        if (footerLogoUrl) {
            try {
                const response = await fetch(footerLogoUrl);
                const blob = await response.blob();
                const reader = new FileReader();
                const base64Promise = new Promise<string>((resolve, reject) => {
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                });
                reader.readAsDataURL(blob);
                const base64 = await base64Promise;
                const imgWidth = 205;
                const imgHeight = 26;
                const x = (pageWidth - imgWidth) / 4;
                const pageHeight = doc.internal.pageSize.getHeight();
                doc.addImage(base64, 'PNG', x, pageHeight - imgHeight - 2, imgWidth, imgHeight);
            } catch (e) { }
        }
    const pad = (n: number) => String(n).padStart(2, '0');
    const now = new Date();
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    doc.save(`telco-bill-summary-batch-${timestamp}.pdf`);
        toast.success('Batch PDF downloaded!');
    } catch (err) {
        toast.error('Failed to export batch PDF.');
    }
}
