import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { authenticatedApi } from '@/config/api';

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

export async function generateFuelCostCenterReport({ stmt_id }: { stmt_id: number }) {
    const res = await authenticatedApi.get(`/api/bills/fuel/${stmt_id}`);
    const data = (res.data as { data: any }).data;

    let staffCostRows: any[] = [];
    let otherRows: any[] = [];

    if (data && Array.isArray(data.details)) {
        const costCenterTotals: Record<string, { name: string; totalAmount: number; purpose: string }> = {};
        data.details.forEach((item: any) => {
            const name = item.asset?.costcenter?.name || 'Unknown';
            const amount = parseFloat(item.amount || '0');
            const purpose = item.purpose || 'Other';
            if (!costCenterTotals[name]) {
                costCenterTotals[name] = { name, totalAmount: 0, purpose };
            }
            costCenterTotals[name].totalAmount += amount;
        });
        Object.values(costCenterTotals).forEach((cc) => {
            if (cc.purpose === 'staff cost') {
                staffCostRows.push({
                    no: staffCostRows.length + 1,
                    costCenter: cc.name,
                    totalAmount: cc.totalAmount,
                });
            } else {
                otherRows.push({
                    no: otherRows.length + 1,
                    costCenter: cc.name,
                    totalAmount: cc.totalAmount,
                });
            }
        });
    }

    if (!staffCostRows.length && !otherRows.length) {
        throw new Error('No summary data found for this statement.');
    }

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
            doc.addImage(base64, 'PNG', pageWidth - 32, 14, 18, 28); // right (lower number close to the right), top (lower number close to the top), width, height
        } catch (e) {
            // If logo fails to load, continue without it
        }
    }

    // Header - Fixed Content
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('M E M O', pageWidth / 15, 24, { align: 'left' }); // right (lower number close to the right), top (lower number close to the top)

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Our Ref : ${stmt_id}`, 15, 34);
    doc.text(`Date : ${new Date().toLocaleDateString()}`, pageWidth - 70, 34, { align: 'right' });

    doc.text('To      : Head of Finance', 15, 44);
    doc.text('Of      : Ranhill Technologies Sdn Bhd', pageWidth - 95, 44, { align: 'left' });
    doc.text('Copy  :', 15, 48);
    doc.text('Of      :', pageWidth - 95, 48, { align: 'left' });
    doc.text('From  : Human Resource & Administration', 15, 52);
    doc.text('Of      : Ranhill Technologies Sdn Bhd', pageWidth - 95, 52, { align: 'left' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);


    doc.text('FUEL BILLS - JUNE 2025', 15, 64);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Kindly please make a payment to  as follows:', 15, 70);

    // Table with columns: No, Cost Center, Total Amount
    let y = 75;
    const tableHeaderRow = [
        'No', 'Cost Center', 'Total Amount (RM)'
    ];
    
    // Combine both staff cost and other rows into one table body with sequential numbering
    const allRows = [...staffCostRows, ...otherRows];
    const tableBody = allRows.map((row, index) => [
        String(index + 1),
        row.costCenter,
        row.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })
    ]);

    autoTable(doc, {
        startY: y,
        head: [tableHeaderRow],
        body: tableBody,
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 1 },
        headStyles: {
            fontStyle: 'bold',
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0]
        },
        didDrawCell: function (data) {
            if (data.section === 'head') {
                const { cell } = data;
                const doc = data.doc;
                doc.setDrawColor(200);
                doc.setLineWidth(0.1);
                doc.rect(cell.x, cell.y, cell.width, cell.height);
            }
        },
        columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 120, halign: 'left' },
            2: { cellWidth: 45, halign: 'right' },
        },
        margin: { left: 14, right: 14 },
        tableWidth: 'auto',
        theme: 'grid',
        didDrawPage: (data) => {
            if (data.cursor) {
                y = data.cursor.y;
            }
        },
    });

    // Add totals below the table using autoTable for consistent formatting
    const subtotalValue = allRows.reduce((acc, row) => acc + row.totalAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
    const roundingValue = '0.00';
    const discountValue = '0.00';
    const grandTotalValue = subtotalValue;

    const totalsData = [
        ['', 'Subtotal (RM):', subtotalValue],
        ['', 'Rounding (RM):', roundingValue],
        ['', 'Discount (RM):', discountValue],
        ['', 'Grand Total (RM):', grandTotalValue]
    ];

    autoTable(doc, {
        startY: y,
        body: totalsData,
        styles: { 
            font: 'helvetica', 
            fontSize: 9, 
            cellPadding: 1,
            fontStyle: 'bold',
            fillColor: [255, 255, 255]
        },
        alternateRowStyles: {
            fillColor: [255, 255, 255]
        },
        columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 120, halign: 'right' },
            2: { cellWidth: 45, halign: 'right' },
        },
        margin: { left: 14, right: 14 },
        tableWidth: 'auto',
        theme: 'grid',
        didDrawPage: (data) => {
            if (data.cursor) {
                y = data.cursor.y;
            }
        },
    });

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

    return new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
}
