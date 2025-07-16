import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { authenticatedApi } from '@/config/api';


// Utility to generate and download PDF for bill summary using jsPDF
export async function exportTelcoBillSummaryPDF(utilId: number) {
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
        doc.text(`Date : ${currentDate.toLocaleDateString()}`, pageWidth - 70, 34, { align: 'right' });
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
        if (bill.ubill_date) {
            const billDate = new Date(bill.ubill_date);
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
                bill.ubill_date ? new Date(bill.ubill_date).toLocaleDateString() : '',
                bill.ubill_no || '',
                s.costcenter?.name || '-',
                //Number(s.total_amt).toLocaleString(undefined, { minimumFractionDigits: 2 }),
                Number(s.total_amt).toLocaleString(undefined, { minimumFractionDigits: 2 })
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
        const subtotalValue = Number(bill.ubill_stotal).toLocaleString(undefined, { minimumFractionDigits: 2 });
        
        // Calculate total tax
        const taxLabel = 'Tax (RM):';
        const totalTaxValue = Number(bill.ubill_tax).toLocaleString(undefined, { minimumFractionDigits: 2 });

        // Rounding
        const roundLabel = 'Rounding (RM):';
        const roundValue = Number(bill.ubill_round).toLocaleString(undefined, { minimumFractionDigits: 2 });
        
        // Grand total
        const grandTotalLabel = 'Grand Total:';
        const grandTotalValue = Number(bill.ubill_gtotal).toLocaleString(undefined, { minimumFractionDigits: 2 });
        
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
