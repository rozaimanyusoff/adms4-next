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
            'No', 'Account', 'Inv No', 'Cost Center', 'Location', 'Rental (RM)', 'Color (RM)', 'B/W (RM)', 'Sub-total (RM)'
        ];
        let rowNum = 1;
        const tableBody = [
            tableHeaderRow,
            ...bills.map((bill: any) => {
                return [
                    String(rowNum++),
                    bill.account?.account || bill.account?.account_no || '',
                    //bill.ubill_date ? formatDate(bill.ubill_date) : '',
                    bill.ubill_no || '',
                    bill.account?.costcenter?.name || (bill.costcenter?.name || '-'),
                    bill.account?.location?.name || (bill.location?.name || '-'),
                    Number(bill.ubill_rent || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }),
                    Number(bill.ubill_color || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }),
                    Number(bill.ubill_bw || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }),
                    Number(bill.ubill_gtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }),
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
        });

        y = (doc as any).lastAutoTable.finalY + 4;

        // Totals for printing fields — render a boxed totals area on the right
        const totalRent = bills.reduce((sum: number, b: any) => sum + Number(b.ubill_rent || 0), 0);
        const totalColor = bills.reduce((sum: number, b: any) => sum + Number(b.ubill_color || 0), 0);
        const totalBw = bills.reduce((sum: number, b: any) => sum + Number(b.ubill_bw || 0), 0);
        const grandTotal = bills.reduce((sum: number, b: any) => sum + Number(b.ubill_gtotal || 0), 0);
        const totalRentLabel = 'Total Rental (RM):';
        const totalColorLabel = 'Total Color (RM):';
        const totalBwLabel = 'Total B/W (RM):';
        const grandTotalLabel = 'Grand Total (RM):';
        const totalRentValue = totalRent.toLocaleString(undefined, { minimumFractionDigits: 2 });
        const totalColorValue = totalColor.toLocaleString(undefined, { minimumFractionDigits: 2 });
        const totalBwValue = totalBw.toLocaleString(undefined, { minimumFractionDigits: 2 });
        const grandTotalValue = grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 });
        const xStart = 14; // 14 margin + 140 box width
        const rowHeight = 6; // Grand total box height
        const colWidth = [8, 20, 20, 25, 25, 20, 20, 20, 25]; // widths for Rental, Color, B/W, Grand Total columns
        const totalTableWidth = colWidth.reduce((a, b) => a + b, 0); // sum of all colWidths
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(200);
        doc.setLineWidth(0.1);
        doc.rect(xStart, y - 4, totalTableWidth, rowHeight, 'FD'); // drawbox for Grand Total ('FD' = fill and draw)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        //doc.text(totalRentLabel, xStart + totalTableWidth - 28, y, { align: 'right' }); // 1st line label
        //doc.text(totalRentValue, xStart + totalTableWidth - 66, y, { align: 'right' }); // 1st line value
        //doc.text(totalBwLabel, xStart + totalTableWidth - 28, y + 5, { align: 'right' });
        //doc.text(totalBwValue, xStart + totalTableWidth - 46, y, { align: 'right' });
        //doc.text(totalColorLabel, xStart + totalTableWidth - 28, y + 10, { align: 'right' });
        //doc.text(totalColorValue, xStart + totalTableWidth - 26, y, { align: 'right' });
        doc.text(grandTotalLabel, xStart + totalTableWidth - 26, y, { align: 'right' });
        doc.text(grandTotalValue, xStart + totalTableWidth - 1, y, { align: 'right' });
        y += 10; // line spacing below box

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
