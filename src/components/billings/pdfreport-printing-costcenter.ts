// Printing export: Generate a single PDF for multiple printing bills
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { authenticatedApi } from '@/config/api';
import { addHeaderFooter, ensurePageBreakForSignatures } from './pdf-helpers';

// Shared small helper (formatDate kept local to file to avoid circular edits)
function formatDate(dateInput: string | Date | undefined): string {
    if (!dateInput) return '';
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1);
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

export async function exportPrintingBillSummary(beneficiaryId: string | number | null, utilIds: number[]) {
    if (!utilIds || utilIds.length === 0) return;
    try {
        const endpoint = `/api/bills/util/printing/by-ids/${beneficiaryId}`;
        const res = await authenticatedApi.post(endpoint,
            JSON.stringify({ ids: utilIds }),
            { headers: { 'Content-Type': 'application/json' } }
        ) as { data: { data: any[] } };
        const responseData = (res as any)?.data || {};
        const bills = responseData.data || [];
        let responseBeneficiary = responseData.beneficiary || null;
        if (responseBeneficiary && (responseBeneficiary as any).beneficiary) {
            responseBeneficiary = (responseBeneficiary as any).beneficiary;
        }
        try {
            console.log('exportPrintingBillSummary: responseBeneficiary ->', responseBeneficiary);
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
        // Add logo if available
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
        const refUtil = (Array.isArray(utilIds) && utilIds.length) ? String(utilIds[0]) : (bills[0]?.util_id ? String(bills[0].util_id) : 'N/A');
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
        const now = new Date();
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const billMonthYear = `${prev.toLocaleString(undefined, { month: 'long' })} ${now.getFullYear()}`;
        doc.text(`PRINTING BILLS - ${billMonthYear}`, 15, 64);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const memoBeneficiaryName = responseBeneficiary?.name || '';
        if (memoBeneficiaryName) {
            doc.text(`Kindly please make a payment to ${memoBeneficiaryName} as follows:`, 15, 70);
        } else {
            doc.text(`Kindly please make a payment to the following beneficiaries as follows:`, 15, 70);
        }

        let y = 75;
        const tableHeaderRow = [
            'No', 'Account No', 'Inv No', 'Cost Center', 'Location', 'Rental (RM)', 'Color (RM)', 'B/W (RM)', 'Sub-total (RM)'
        ];
        let rowNum = 1;
        let totalRent = 0;
        let totalColor = 0;
        let totalBw = 0;
        let grandTotal = 0;

        const tableBody = bills.map((bill: any) => {
            const rent = Number(bill.ubill_rent || 0);
            const color = Number(bill.ubill_color || 0);
            const bw = Number(bill.ubill_bw || 0);
            const gtotal = Number(bill.ubill_gtotal || 0);

            totalRent += rent;
            totalColor += color;
            totalBw += bw;
            grandTotal += gtotal;

            return [
                String(rowNum++),
                bill.account?.account || bill.account?.account_no || '',
                bill.ubill_no || '',
                bill.account?.costcenter?.name || (bill.costcenter?.name || '-'),
                bill.account?.location?.name || (bill.location?.name || '-'),
                rent.toLocaleString(undefined, { minimumFractionDigits: 2 }),
                color.toLocaleString(undefined, { minimumFractionDigits: 2 }),
                bw.toLocaleString(undefined, { minimumFractionDigits: 2 }),
                gtotal.toLocaleString(undefined, { minimumFractionDigits: 2 }),
            ];
        });

        autoTable(doc, {
            startY: y,
            head: [tableHeaderRow],
            body: tableBody,
            styles: { font: 'helvetica', fontSize: 9, cellPadding: 1 },
            columnStyles: {
                0: { cellWidth: 8, halign: 'center' },
                1: { cellWidth: 20, halign: 'left' },
                2: { cellWidth: 20, halign: 'center' },
                3: { cellWidth: 25, halign: 'left' },
                4: { cellWidth: 25, halign: 'left' },
                5: { cellWidth: 20, halign: 'right' },
                6: { cellWidth: 20, halign: 'right' },
                7: { cellWidth: 20, halign: 'right' },
                8: { cellWidth: 25, halign: 'right' },
            },
            margin: { left: 14, right: 14 },
            tableWidth: 'auto',
            theme: 'grid',
            headStyles: {
                fillColor: [41, 128, 185],
                textColor: 255,
                fontStyle: 'bold',
                fontSize: 9,
                halign: 'center',
            },
            footStyles: {
                fillColor: [240, 240, 240],
                textColor: 0,
                fontStyle: 'bold',
                fontSize: 9,
                halign: 'right',
                lineWidth: 0.1,
                lineColor: [200, 200, 200],
            },
            foot: [[
                { content: '', colSpan: 4 },
                'Grand Total (RM):',
                totalRent.toLocaleString(undefined, { minimumFractionDigits: 2 }),
                totalColor.toLocaleString(undefined, { minimumFractionDigits: 2 }),
                totalBw.toLocaleString(undefined, { minimumFractionDigits: 2 }),
                grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 }),
            ]],
            didParseCell(data: any) {
                // Remove left border on the Totals label cell in the footer row
                if (data.section === 'foot' && data.column.index === 4) {
                    data.cell.styles.lineWidth = { top: 0.1, right: 0.1, bottom: 0.1, left: 0 };
                }
            },
        });

        y = (doc as any).lastAutoTable.finalY + 10;

        // Signatures area (reuse helper)
        y = ensurePageBreakForSignatures(doc, y, { signaturesHeight: 60, bottomMargin: 40, newPageTopMargin: 50 });

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
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('Date:', 15, y);
        doc.text('Date:', pageWidth / 2 - 28, y);
        doc.text('Date:', pageWidth - 73, y);
        y += 10;

        // Previous 5 bills trend table (if available per account) - shown after signatures
        try {
            // Build account -> meta + previous_5_bills map
            const accountPrevMap = new Map<string, { arr: any[]; costcenter?: string; location?: string }>();
            bills.forEach((b: any) => {
                const acct = b?.account?.account_no;
                if (!acct) return;
                const meta = {
                    arr: Array.isArray(b?.previous_5_bills) ? [...b.previous_5_bills] : [],
                    costcenter: b?.account?.costcenter?.name,
                    location: b?.account?.location?.name,
                };
                if (meta.arr.length) accountPrevMap.set(acct, meta);
            });

            if (accountPrevMap.size) {
                // Start the previous bills table on a fresh page (after header/logo space)
                doc.addPage();
                y = 50;

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
                        row.push(`RM ${amt}`);
                    });
                    bodyRows.push(row);
                });

                // Render compact grid with font size 7
                autoTable(doc, {
                    startY: y,
                    head: [headRow],
                    body: bodyRows,
                    styles: { font: 'helvetica', fontSize: 7, cellPadding: 1, halign: 'right' },
                    headStyles: { fontStyle: 'bold', fillColor: [240, 240, 240], textColor: [0, 0, 0], halign: 'center' },
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
            // swallow errors if previous_5_bills not present
        }

        const pad = (n: number) => String(n).padStart(2, '0');
        const tsNow = new Date();
        const timestamp = `${tsNow.getFullYear()}${pad(tsNow.getMonth() + 1)}${pad(tsNow.getDate())}${pad(tsNow.getHours())}${pad(tsNow.getMinutes())}${pad(tsNow.getSeconds())}`;

        // Add header/footer to all pages
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
             
            await addHeaderFooter(doc, i, totalPages, pageWidth);
        }

        doc.save(`printing-bill-summary-batch-${timestamp}.pdf`);
        toast.success('Printing batch PDF downloaded!');
    } catch (err) {
        toast.error('Failed to export printing batch PDF.');
    }
}
