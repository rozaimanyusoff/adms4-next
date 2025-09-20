import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { authenticatedApi } from '@/config/api';
import { addHeaderFooter } from './pdf-helpers';

// Register the plugin
(jsPDF as any).autoTable = autoTable;

export interface MaintenanceInvoiceRow {
    no: number;
    item: string;
    qty: number;
    unitPrice: number;
    discount: number;
    subTotal: number;
}

export interface MaintenanceReportData {
    inv_id: number;
    inv_no: string;
    inv_date: string;
    svc_order: string;
    svc_date: string;
    svc_odo: string;
    inv_total: string;
    inv_stat: string;
    inv_remarks?: string;
    asset: {
        register_number: string;
        fuel_type: string;
        costcenter?: { name: string };
        location?: { name: string };
    };
    workshop: {
        name: string;
    };
    parts: Array<{
        part_name: string;
        qty: number;
        part_uprice: string;
        part_amount: string;
    }>;
}

export async function generateMaintenanceReport({ inv_id }: { inv_id: number }) {
    const res = await authenticatedApi.get(`/api/bills/mtn/${inv_id}`);
    const data = (res.data as { data: MaintenanceReportData }).data;

    if (!data) {
        throw new Error('No maintenance bill data found for this invoice.');
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Add header and footer to first page
    await addHeaderFooter(doc, 1, 1, pageWidth);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('MAINTENANCE INVOICE', pageWidth / 2, 55, { align: 'center' });

    // Invoice header information
    let yPos = 75;
    
    // Left column - Invoice details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Invoice Details:', 20, yPos);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    yPos += 8;
    doc.text(`Invoice No: ${data.inv_no || 'N/A'}`, 20, yPos);
    yPos += 6;
    doc.text(`Invoice ID: ${data.inv_id}`, 20, yPos);
    yPos += 6;
    doc.text(`Invoice Date: ${data.inv_date ? new Date(data.inv_date).toLocaleDateString() : 'N/A'}`, 20, yPos);
    yPos += 6;
    doc.text(`Service Order: ${data.svc_order || 'N/A'}`, 20, yPos);
    yPos += 6;
    doc.text(`Service Date: ${data.svc_date ? new Date(data.svc_date).toLocaleDateString() : 'N/A'}`, 20, yPos);
    yPos += 6;
    doc.text(`Odometer: ${data.svc_odo || 'N/A'}`, 20, yPos);

    // Right column - Vehicle & Workshop details
    yPos = 75;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Vehicle & Workshop:', pageWidth / 2 + 10, yPos);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    yPos += 8;
    doc.text(`Vehicle: ${data.asset?.register_number || 'N/A'}`, pageWidth / 2 + 10, yPos);
    yPos += 6;
    doc.text(`Fuel Type: ${data.asset?.fuel_type || 'N/A'}`, pageWidth / 2 + 10, yPos);
    yPos += 6;
    doc.text(`Cost Center: ${data.asset?.costcenter?.name || 'N/A'}`, pageWidth / 2 + 10, yPos);
    yPos += 6;
    doc.text(`Location: ${data.asset?.location?.name || 'N/A'}`, pageWidth / 2 + 10, yPos);
    yPos += 6;
    doc.text(`Workshop: ${data.workshop?.name || 'N/A'}`, pageWidth / 2 + 10, yPos);

    // Service Items Table
    yPos += 20;
    
    const tableData: MaintenanceInvoiceRow[] = [];
    if (data.parts && Array.isArray(data.parts)) {
        data.parts.forEach((part, index) => {
            tableData.push({
                no: index + 1,
                item: part.part_name || 'N/A',
                qty: part.qty || 0,
                unitPrice: parseFloat(part.part_uprice || '0'),
                discount: 0, // Not implemented yet
                subTotal: parseFloat(part.part_amount || '0')
            });
        });
    }

    // Add table
    (doc as any).autoTable({
        startY: yPos,
        head: [['No.', 'Item', 'Qty', 'U/Price', 'SST', 'Discount', 'Sub-total']],
        body: tableData.map(row => [
            row.no,
            row.item,
            row.qty,
            `RM ${row.unitPrice.toFixed(2)}`,
            '0.00', // SST placeholder
            '0.00', // Discount placeholder
            `RM ${row.subTotal.toFixed(2)}`
        ]),
        theme: 'grid',
        headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 9
        },
        bodyStyles: {
            fontSize: 8,
            cellPadding: 3
        },
        columnStyles: {
            0: { cellWidth: 15, halign: 'center' }, // No.
            1: { cellWidth: 80, halign: 'left' },   // Item
            2: { cellWidth: 20, halign: 'center' }, // Qty
            3: { cellWidth: 25, halign: 'right' },  // U/Price
            4: { cellWidth: 20, halign: 'right' },  // SST
            5: { cellWidth: 20, halign: 'right' },  // Discount
            6: { cellWidth: 30, halign: 'right' }   // Sub-total
        },
        margin: { left: 20, right: 20 }
    });

    // Grand Total
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    const grandTotal = parseFloat(data.inv_total || '0');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Grand-Total (RM): ${grandTotal.toFixed(2)}`, pageWidth - 50, finalY, { align: 'right' });

    // Remarks if available
    if (data.inv_remarks) {
        const remarksY = finalY + 15;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('Remarks:', 20, remarksY);
        doc.text(data.inv_remarks, 20, remarksY + 8);
    }

    // Appreciation message
    const appreciationY = finalY + (data.inv_remarks ? 35 : 25);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Your cooperation on the above is highly appreciated', 20, appreciationY);

    // Update header/footer with correct page count
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        await addHeaderFooter(doc, i, totalPages, pageWidth);
    }

    return doc;
}

export function downloadMaintenanceReport(inv_id: number) {
    generateMaintenanceReport({ inv_id })
        .then(doc => {
            doc.save(`maintenance-invoice-${inv_id}.pdf`);
        })
        .catch(error => {
            console.error('Error generating maintenance report:', error);
            throw error;
        });
}