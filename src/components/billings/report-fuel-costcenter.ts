import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Register the plugin
(jsPDF as any).autoTable = autoTable;

export interface FuelCostCenterRow {
    no: number;
    costCenter: string;
    totalAmount: number;
}

export interface FuelCostCenterReportProps {
    date: string;
    refNo: string;
    rows: FuelCostCenterRow[];
    subTotal: number;
    rounding: number;
    discount: number;
    grandTotal: number;
}

export async function generateFuelCostCenterReport({
    date,
    refNo,
    rows,
    subTotal,
    rounding,
    discount,
    grandTotal,
}: FuelCostCenterReportProps) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Add logo if available
    const logoUrl = process.env.NEXT_PUBLIC_BRAND_LOGO_LIGHT;
    if (logoUrl) {
        try {
            // Fetch the image and convert to base64
            const response = await fetch(logoUrl);
            const blob = await response.blob();
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve, reject) => {
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
            });
            reader.readAsDataURL(blob);
            const base64 = await base64Promise;
            doc.addImage(base64, 'PNG', pageWidth - 32, 12, 16, 26); // right (lower number close to the right), top (lower number close to the top), width, height
        } catch (e) {
            // If logo fails to load, continue without it
        }
    }

    // Header - Fixed Content
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('M E M O', pageWidth / 15, 20, { align: 'left' }); // right (lower number close to the right), top (lower number close to the top)

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Our Ref : ${refNo}`, 15, 32);
    doc.text(`Date : ${date}`, pageWidth - 65, 32, { align: 'right' });

    doc.text('To      : Head of Finance', 15, 40);
    doc.text('Of      : Ranhill Technologies Sdn Bhd', pageWidth - 95, 40, { align: 'left' });
    doc.text('Copy  :', 15, 46);
    doc.text('Of      :', pageWidth - 95, 46, { align: 'left' });
    doc.text('From  : Human Resource & Administration', 15, 52);
    doc.text('Of      : Ranhill Technologies Sdn Bhd', pageWidth - 95, 52, { align: 'left' });

    /* Dynamic Content */
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('FUEL BILLS - JUNE 2025', 15, 62);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Kindly please make a payment to  as follows:', 15, 68);

    // Table
    autoTable(doc, {
        startY: 72,
        head: [[
            'No.',
            'Cost Center',
            'Total Amount',
        ]],
        body: rows.map(row => [row.no, row.costCenter, row.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })]),
        headStyles: { fillColor: [0, 0, 0] },
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 1 }, // Reduced cell padding
        columnStyles: {
            0: { cellWidth: 20, halign: 'center' },
            1: { cellWidth: (pageWidth - 15 * 2) - 20 - 40 }, // dynamic width for cost center
            2: { cellWidth: 40, halign: 'right' },
        },
        margin: { left: 15, right: 15 },
        tableWidth: 'wrap', // Use wrap to respect column widths and fit to page
        theme: 'grid',
    });

    let y = (doc as any).lastAutoTable.finalY + 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Sub-Total:`, pageWidth - 85, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(subTotal.toLocaleString(undefined, { minimumFractionDigits: 2 }), pageWidth - 16, y, { align: 'right' });
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Inv. Rounding:`, pageWidth - 85, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(rounding.toLocaleString(undefined, { minimumFractionDigits: 2 }), pageWidth - 16, y, { align: 'right' });
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Adjustment/Rebate:`, pageWidth - 85, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(discount.toLocaleString(undefined, { minimumFractionDigits: 2 }), pageWidth - 16, y, { align: 'right' });
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Grand-Total:`, pageWidth - 85, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 }), pageWidth - 16, y, { align: 'right' });
    // Draw a line below the Grand-Total
    const lineY = y + 2;
    doc.setLineWidth(0.5);
    doc.line(pageWidth - 85, lineY, pageWidth - 16, lineY);

    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('The payment shall be made before 10th.', 15, y);
    y += 7;
    doc.text('Your cooperation on the above is highly appreciated', 15, y);
    y += 10;
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
    doc.text('NUR AUFA FIRZANA BINTI SINANG', 15, y);
    doc.text('MUHAMMAD ARIF BIN ABDUL JALIL', pageWidth / 2 - 28, y);
    doc.text('KAMARIAH BINTI YUSOF', pageWidth -  73, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Admin Assistant', 15, y);
    doc.text('Senior Executive Administration', pageWidth / 2 - 28, y);
    doc.text('Head of Human Resources and Administration', pageWidth -  73, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Date:', 15, y);
    doc.text('Date:', pageWidth / 2 - 28, y);
    doc.text('Date:', pageWidth -  73, y);

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
            // Place the footer logo centered at the bottom (adjust y/height as needed)
            const imgWidth = 215;
            const imgHeight = 26;
            const x = (pageWidth - imgWidth) / 2;
            const pageHeight = doc.internal.pageSize.getHeight();
            doc.addImage(base64, 'PNG', x, pageHeight - imgHeight - 3, imgWidth, imgHeight);
        } catch (e) {
            // If logo fails to load, continue without it
        }
    }

    // Optionally add footer, logo, etc.

    return doc;
}
