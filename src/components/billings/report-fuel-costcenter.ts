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

export function generateFuelCostCenterReport({
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

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('M E M O', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Our Ref : ${refNo}`, 15, 32);
    doc.text(`Date : ${date}`, pageWidth - 15, 32, { align: 'right' });

    doc.text('To      : Head of Finance', 15, 40);
    doc.text('Of      : Ranhill Technologies Sdn Bhd', pageWidth - 15, 40, { align: 'right' });
    doc.text('Copy  :', 15, 46);
    doc.text('Of      :', pageWidth - 15, 46, { align: 'right' });
    doc.text('From  : Human Resource & Administration', 15, 52);
    doc.text('Of      : Ranhill Technologies Sdn Bhd', pageWidth - 15, 52, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('FUEL BILLS - JUNE 2025', 15, 65);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('Kindly please make a payment to  as follows:', 15, 73);

    // Table
    autoTable(doc, {
        startY: 80,
        head: [[
            'No.',
            'Cost Center',
            'Total Amount',
        ]],
        body: rows.map(row => [row.no, row.costCenter, row.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })]),
        headStyles: { fillColor: [0, 0, 0] },
        styles: { font: 'helvetica', fontSize: 11 },
        columnStyles: {
            0: { cellWidth: 20, halign: 'center' },
            1: { cellWidth: 80 },
            2: { cellWidth: 40, halign: 'right' },
        },
        margin: { left: 15, right: 15 },
        tableWidth: 'auto', // Let autoTable fit the table to the available width
        theme: 'grid',
    });

    let y = (doc as any).lastAutoTable.finalY + 4;
    doc.setFont('helvetica', 'bold');
    doc.text(`Sub-Total:`, pageWidth - 60, y);
    doc.setFont('helvetica', 'normal');
    doc.text(subTotal.toLocaleString(undefined, { minimumFractionDigits: 2 }), pageWidth - 15, y, { align: 'right' });
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text(`Inv. Rounding:`, pageWidth - 60, y);
    doc.setFont('helvetica', 'normal');
    doc.text(rounding.toLocaleString(undefined, { minimumFractionDigits: 2 }), pageWidth - 15, y, { align: 'right' });
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text(`Adjustment/Rebate:`, pageWidth - 60, y);
    doc.setFont('helvetica', 'normal');
    doc.text(discount.toLocaleString(undefined, { minimumFractionDigits: 2 }), pageWidth - 15, y, { align: 'right' });
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text(`Grand-Total:`, pageWidth - 60, y);
    doc.setFont('helvetica', 'normal');
    doc.text(grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 }), pageWidth - 15, y, { align: 'right' });

    y += 12;
    doc.setFont('helvetica', 'normal');
    doc.text('The payment shall be made before 10th.', 15, y);
    y += 6;
    doc.text('Your cooperation on the above is highly appreciated', 15, y);
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Ranhill Technologies Sdn. Bhd.', 15, y);

    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.text('Prepared by,', 15, y);
    doc.text('Checked by,', pageWidth / 2 - 10, y);
    doc.text('Approved by,', pageWidth - 50, y);
    y += 18;
    doc.setFont('helvetica', 'bold');
    doc.text('NUR AUFA FIRZANA BINTI SINANG', 15, y);
    doc.text('MUHAMMAD ARIF BIN ABDUL JALIL', pageWidth / 2 - 10, y);
    doc.text('KAMARIAH BINTI YUSOF', pageWidth - 50, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.text('Admin Assistant', 15, y);
    doc.text('Senior Executive Administration', pageWidth / 2 - 10, y);
    doc.text('Head of Human Resources and Administration', pageWidth - 50, y);
    y += 6;
    doc.text('Date:', 15, y);
    doc.text('Date:', pageWidth / 2 - 10, y);
    doc.text('Date:', pageWidth - 50, y);

    // Optionally add footer, logo, etc.

    return doc;
}
