// Batch export: Generate a single PDF for multiple telco bills
export async function exportTelcoBillSummaryPDFs(utilIds: number[]) {
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
        // Fetch all bills and flatten all summary rows
        const bills: any[] = [];
        for (const utilId of utilIds) {
            const res = await authenticatedApi.get(`/api/telco/bills/${utilId}`) as { data: { data: any } };
            const bill = (res as any)?.data?.data;
            if (bill && bill.summary) bills.push(bill);
        }
        if (bills.length === 0) {
            toast.error('No summary data found for selected bills.');
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
        doc.text(`Our Ref : RT/NRW/JOHOR 8/TECH/IT/F04 ( )`, 15, 34);
        const currentDate = new Date();
        doc.text(`Date : ${formatDate(currentDate)}`, pageWidth - 70, 34, { align: 'right' });
        doc.text('To      : Head of Finance', 15, 44);
        doc.text('Of      : Ranhill Technologies Sdn Bhd', pageWidth - 95, 44, { align: 'left' });
        doc.text('Copy  :', 15, 48);
        doc.text('Of      :', pageWidth - 95, 48, { align: 'left' });
        doc.text(`From  : Head of Technology`, 15, 52);
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
        doc.text(`TELCO BILLS - ${billMonthYear}`, 15, 64);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Kindly please make a payment to the following providers as follows:`, 15, 70);
        let y = 75;
        const tableHeaderRow = [
            'No', 'Account No', 'Date', 'Bill/Inv No', 'Provider', 'Cost Center', 'Total (RM)'
        ];
        let rowNum = 1;
        const tableBody = [
            tableHeaderRow,
            ...bills.flatMap((bill) => bill.summary.map((s: any) => [
                String(rowNum++),
                bill.account?.account_no || '',
                bill.bill_date ? formatDate(bill.bill_date) : '',
                bill.bill_no || '',
                bill.account?.provider || '',
                s.costcenter?.name || '-',
                Number(s.cc_amount).toLocaleString(undefined, { minimumFractionDigits: 2 }),
            ]))
        ];
        autoTable(doc, {
            startY: y,
            head: [],
            body: tableBody,
            styles: { font: 'helvetica', fontSize: 9, cellPadding: 1 },
            didParseCell: function (data: any) {
                if (data.row.index === 0) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [255,255,255];
                    data.cell.styles.textColor = [0,0,0];
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
                0: { cellWidth: 12, halign: 'center' },
                1: { cellWidth: 36, halign: 'center' },
                2: { cellWidth: 28, halign: 'center' },
                3: { cellWidth: 38, halign: 'center' },
                4: { cellWidth: 36, halign: 'center' },
                5: { cellWidth: 36, halign: 'center' },
                6: { cellWidth: 28, halign: 'right' },
            },
            margin: { left: 14, right: 14 },
            tableWidth: 'auto',
            theme: 'grid',
        });
        y = (doc as any).lastAutoTable.finalY + 4;
        // Calculate totals for all selected bills
        const subtotal = bills.reduce((sum, bill) => sum + Number(bill.subtotal || 0), 0);
        const totalTax = bills.reduce((sum, bill) => sum + Number(bill.tax || 0), 0);
        const totalRounding = bills.reduce((sum, bill) => sum + Number(bill.rounding || 0), 0);
        const grandTotal = bills.reduce((sum, bill) => sum + Number(bill.grand_total || 0), 0);
        const subtotalLabel = 'Subtotal (RM):';
        const subtotalValue = subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 });
        const taxLabel = 'Tax (RM):';
        const totalTaxValue = totalTax.toLocaleString(undefined, { minimumFractionDigits: 2 });
        const roundLabel = 'Rounding (RM):';
        const roundValue = totalRounding.toLocaleString(undefined, { minimumFractionDigits: 2 });
        const grandTotalLabel = 'Grand Total:';
        const grandTotalValue = grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 });
        const colWidths = [12, 36, 28, 38, 36, 36, 28];
        const totalTableWidth = colWidths.reduce((a, b) => a + b, 0);
        const xStart = 14;
        const rowHeight = 6;
        doc.setFillColor(255,255,255);
        doc.setDrawColor(200);
        doc.setLineWidth(0.1);
        doc.rect(xStart, y - 4, totalTableWidth, rowHeight, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(subtotalLabel, xStart + totalTableWidth - 28, y, { align: 'right' });
        doc.text(subtotalValue, xStart + totalTableWidth - 1, y, { align: 'right' });
        y += rowHeight;
        doc.setFillColor(255,255,255);
        doc.setDrawColor(200);
        doc.setLineWidth(0.1);
        doc.rect(xStart, y - 4, totalTableWidth, rowHeight, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(taxLabel, xStart + totalTableWidth - 28, y, { align: 'right' });
        doc.text(totalTaxValue, xStart + totalTableWidth - 1, y, { align: 'right' });
        y += rowHeight;
        doc.setFillColor(255,255,255);
        doc.setDrawColor(200);
        doc.setLineWidth(0.1);
        doc.rect(xStart, y - 4, totalTableWidth, rowHeight, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(roundLabel, xStart + totalTableWidth - 28, y, { align: 'right' });
        doc.text(roundValue, xStart + totalTableWidth - 1, y, { align: 'right' });
        y += rowHeight;
        doc.setFillColor(255,255,255);
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
            { name: 'NORHAMIZAH BINTI ABU', title: 'Executive', x: 15 },
            { name: 'ROZAIMAN BIN YUSOFF', title: 'Head of IT Section', x: pageWidth / 2 - 28 },
            { name: 'NOR SUHADA BINTI HASAN', title: 'Head of Technology', x: pageWidth - 73 }
        ];
        signatures.forEach(sig => {
            doc.text(sig.name, sig.x, y);
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
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.text('This billing memo is generated by ADMS4', pageWidth / 2, y, { align: 'center' });
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
        doc.save(`telco-bill-summary-batch.pdf`);
        toast.success('Batch PDF downloaded!');
    } catch (err) {
        toast.error('Failed to export batch PDF.');
    }
}
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { authenticatedApi } from '@/config/api';


// Utility to generate and download PDF for bill summary using jsPDF
export async function exportTelcoBillSummaryPDF(utilId: number) {
    // Reusable date formatter: dd/m/yyyy
    function formatDate(dateInput: string | Date | undefined): string {
        if (!dateInput) return '';
        const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1); // no leading zero for month
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }
        // ...existing code...
    try {
        const res = await authenticatedApi.get(`/api/telco/bills/${utilId}`) as { data: { data: any } };
        const bill = (res as any)?.data?.data;
        if (!bill || !bill.summary) {
            toast.error('No summary data found for this bill.');
            return;
        }

        // Editable variable for department/sender
        const senderDepartment = 'Head of Technology';

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Signature section variables (must be after pageWidth is defined)
        const signatures = [
            {
                name: 'NORHAMIZAH BINTI ABU',
                title: 'Executive',
                x: 15
            },
            {
                name: 'ROZAIMAN BIN YUSOFF',
                title: 'Head of IT Section',
                x: pageWidth / 2 - 28
            },
            {
                name: 'NOR SUHADA BINTI HASAN',
                title: 'Head of Technology',
                x: pageWidth - 73
            }
        ];

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

        // Header - Memo style
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('M E M O', pageWidth / 15, 24, { align: 'left' });
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Our Ref : RT/NRW/JOHOR 8/TECH/IT/F04 ( )`, 15, 34);
        // Use current date for header
        const currentDate = new Date();
        // Format current date as dd/m/yyyy
        doc.text(`Date : ${formatDate(currentDate)}`, pageWidth - 70, 34, { align: 'right' });
        doc.text('To      : Head of Finance', 15, 44);
        doc.text('Of      : Ranhill Technologies Sdn Bhd', pageWidth - 95, 44, { align: 'left' });
        doc.text('Copy  :', 15, 48);
        doc.text('Of      :', pageWidth - 95, 48, { align: 'left' });
        doc.text(`From  : ${senderDepartment}`, 15, 52);
        doc.text('Of      : Ranhill Technologies Sdn Bhd', pageWidth - 95, 52, { align: 'left' });

        // Dynamic Content
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        // Show month and year of bill date in TELCO BILLS - ...
        let billMonthYear = '';
        if (bill.bill_date) {
            const billDate = new Date(bill.bill_date);
            billMonthYear = billDate.toLocaleString(undefined, { month: 'long', year: 'numeric' });
        }
        doc.text(`TELCO BILLS - ${billMonthYear}`, 15, 64);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Kindly please make a payment to ${bill.account?.provider || ''} as follows:`, 15, 70);


        // Table with columns: No, A/c No, Date, Bill/Inv No, Cost Center, Amount (RM), Tax (RM), Total (RM)

        let y = 75;
        const tableHeaderRow = [
            'No', 'Account No', 'Date', 'Bill/Inv No', 'Cost Center', 'Total (RM)'
        ];
        const tableBody = [
            tableHeaderRow,
            ...bill.summary.map((s: any, idx: number) => [
                String(idx + 1),
                bill.account?.account_no || '',
                bill.bill_date ? formatDate(bill.bill_date) : '',
                bill.bill_no || '',
                s.costcenter?.name || '-',
                Number(s.cc_amount).toLocaleString(undefined, { minimumFractionDigits: 2 }), //costcenter amount
            ])
        ];

        autoTable(doc, {
            startY: y,
            head: [], // No separate header, header is part of body
            body: tableBody,
            styles: { font: 'helvetica', fontSize: 9, cellPadding: 1 },
            didParseCell: function (data: any) {
                // Make the first row (header) bold and styled
                if (data.row.index === 0) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [255,255,255];
                    data.cell.styles.textColor = [0,0,0];
                }
            },
            didDrawCell: function (data: any) {
                // Draw border for header row (row.index === 0)
                if (data.row.index === 0) {
                    const { cell } = data;
                    const doc = data.doc;
                    doc.setDrawColor(200);
                    doc.setLineWidth(0.1);
                    doc.rect(cell.x, cell.y, cell.width, cell.height);
                }
            },
            columnStyles: {
                0: { cellWidth: 12, halign: 'center' },
                1: { cellWidth: 36, halign: 'center' },
                2: { cellWidth: 28, halign: 'center' },
                3: { cellWidth: 38, halign: 'center' },
                4: { cellWidth: 36, halign: 'center' },
                5: { cellWidth: 28, halign: 'right' },
            },
            margin: { left: 14, right: 14 },
            tableWidth: 'auto',
            theme: 'grid',
        });


        y = (doc as any).lastAutoTable.finalY + 4;
        // Subtotal row
        const subtotalLabel = 'Subtotal (RM):';
        const subtotalValue = Number(bill.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 });
        
        // Calculate total tax
        const taxLabel = 'Tax (RM):';
        const totalTaxValue = Number(bill.tax).toLocaleString(undefined, { minimumFractionDigits: 2 });

        // Rounding
        const roundLabel = 'Rounding (RM):';
        const roundValue = Number(bill.rounding).toLocaleString(undefined, { minimumFractionDigits: 2 });
        
        // Grand total
        const grandTotalLabel = 'Grand Total:';
        const grandTotalValue = Number(bill.grand_total).toLocaleString(undefined, { minimumFractionDigits: 2 });
        
        const colWidths = [12, 36, 28, 38, 36, 28]; // Column widths for the summary table
        const totalTableWidth = colWidths.reduce((a, b) => a + b, 0); // Total width of the summary table
        const xStart = 14; //start from left margin
        const rowHeight = 6; // Row height for summary rows

        // Draw subtotal row
        doc.setFillColor(255,255,255);
        doc.setDrawColor(200);
        doc.setLineWidth(0.1);
        doc.rect(xStart, y - 4, totalTableWidth, rowHeight, 'FD'); // Fill and draw rectangle
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(subtotalLabel, xStart + totalTableWidth - 28, y, { align: 'right' });
        doc.text(subtotalValue, xStart + totalTableWidth - 1, y, { align: 'right' });

        // Draw total tax row
        y += rowHeight;
        doc.setFillColor(255,255,255);
        doc.setDrawColor(200);
        doc.setLineWidth(0.1);
        doc.rect(xStart, y - 4, totalTableWidth, rowHeight, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(taxLabel, xStart + totalTableWidth - 28, y, { align: 'right' });
        doc.text(totalTaxValue, xStart + totalTableWidth - 1, y, { align: 'right' });

        // Draw rounding row
        y += rowHeight;
        doc.setFillColor(255,255,255);
        doc.setDrawColor(200);
        doc.setLineWidth(0.1);
        doc.rect(xStart, y - 4, totalTableWidth, rowHeight, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(roundLabel, xStart + totalTableWidth - 28, y, { align: 'right' });
        doc.text(roundValue, xStart + totalTableWidth - 1, y, { align: 'right' });

        // Draw grand total row
        y += rowHeight;
        doc.setFillColor(255,255,255);
        doc.setDrawColor(200);
        doc.setLineWidth(0.1);
        doc.rect(xStart, y - 4, totalTableWidth, rowHeight, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(grandTotalLabel, xStart + totalTableWidth - 28, y, { align: 'right' });
        doc.text(grandTotalValue, xStart + totalTableWidth - 1, y, { align: 'right' });

        // Footer section (signatures, etc.)
        y += 10;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        //doc.text('The payment shall be made before 10th.', 15, y);
        //y += 7;
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
        // Signature names
        signatures.forEach(sig => {
            doc.text(sig.name, sig.x, y);
        });
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        // Signature titles
        signatures.forEach(sig => {
            doc.text(sig.title, sig.x, y);
        });
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('Date:', 15, y);
        doc.text('Date:', pageWidth / 2 - 28, y);
        doc.text('Date:', pageWidth - 73, y);

        // Add a note at the bottom
        y += 10;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.text('This billing memo is generated by ADMS4', pageWidth / 2, y, { align: 'center' });

        // Footer logo if available
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
                const x = (pageWidth - imgWidth) / 4; // Centered horizontally
                // Place the footer logo centered at the bottom (adjust y/height as needed)
                const pageHeight = doc.internal.pageSize.getHeight();
                doc.addImage(base64, 'PNG', x, pageHeight - imgHeight - 2, imgWidth, imgHeight); // Adjusted y position
            } catch (e) { }
        }

        doc.save(`telco-bill-summary-${bill.ubill_no || utilId}.pdf`);
        toast.success('PDF downloaded!');
    } catch (err) {
        toast.error('Failed to export PDF.');
    }
}
