import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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

// Currency formatter with thousand separators
function formatCurrency(amount: string | number): string {
   const num = typeof amount === 'string' ? parseFloat(amount) : amount;
   if (isNaN(num)) return '0.00';
   return num.toLocaleString('en-MY', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
   });
}

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
      part_qty: number;
      part_uprice: string;
      part_amount: string;
      part_final_amount: string;
   }>;
}

export async function generateMaintenanceReport({
   inv_id,
   preparedByName,
   preparedByTitle,
}: {
   inv_id: number;
   preparedByName?: string;
   preparedByTitle?: string;
}) {
   const res = await authenticatedApi.get(`/api/bills/mtn/${inv_id}`);
   const data = (res.data as { data: MaintenanceReportData }).data;

   if (!data) {
      throw new Error('No maintenance bill data found for this invoice.');
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

   // Add header and footer to first page
   await addHeaderFooter(doc, 1, 1, pageWidth);

   // Title
   doc.setFont('helvetica', 'bold');
   doc.setFontSize(18);
   doc.text('M E M O', pageWidth / 15, 24, { align: 'left' });
   doc.setFontSize(9);
   doc.setFont('helvetica', 'normal');
   doc.text(`Our Ref : RT/HRA/AD/F02/10 (${inv_id})`, 15, 34);
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
   doc.text(`VEHICLE MAINTENANCE BILLING - ${data.asset?.register_number || 'N/A'}`, 15, 64);
   doc.setFont('helvetica', 'normal');
   doc.setFontSize(9);

   doc.text(`Kindly please make a payment as follows:`, 15, 70);


   // Invoice header information
   let y = 78;

   // Draw outer lines on Workshop/Invoice/Vehicle info section
   const rowHeight = 38;
   const colWidth = pageWidth - 28;
   doc.rect(14, y, colWidth, rowHeight); // Outer rectangle
   doc.line(14 + colWidth, y, 14 + colWidth, y + rowHeight); // Vertical line
   //Workshop name at the top
   y += 5;
   doc.setFont('helvetica', 'bold');
   doc.setFontSize(10);
   doc.text(`Workshop: ${data.workshop?.name || 'N/A'}`, 16, y);

   y += 8;
   // Left column - Invoice details
   doc.setFont('helvetica', 'bold');
   doc.setFontSize(10);
   doc.text('Invoice Details:', 16, y);

   y += 6;
   doc.setFont('helvetica', 'normal');
   doc.setFontSize(9);
   doc.text(`Invoice No: ${data.inv_no || 'N/A'}`, 16, y);
   y += 4;
   doc.text(`Invoice Date: ${data.inv_date ? new Date(data.inv_date).toLocaleDateString() : 'N/A'}`, 16, y);
   y += 4;
   doc.text(`Service Date: ${data.svc_date ? new Date(data.svc_date).toLocaleDateString() : 'N/A'}`, 16, y);
   y += 4;
   doc.text(`Service Remarks: ${data.inv_remarks || 'N/A'}`, 16, y);

   // Right column - Vehicle Information
   y = 91;
   doc.setFont('helvetica', 'bold');
   doc.setFontSize(10);
   doc.text('Application Details:', pageWidth / 2 + 10, y);

   doc.setFont('helvetica', 'normal');
   doc.setFontSize(9);
   y += 6;
   doc.text(`Service Order: ${data.svc_order || 'N/A'}`, pageWidth / 2 + 10, y);
   y += 4;
   doc.text(`Odometer: ${data.svc_odo || 'N/A'}`, pageWidth / 2 + 10, y);
   y += 4;
   doc.text(`Register Number: ${data.asset?.register_number || 'N/A'}`, pageWidth / 2 + 10, y);
   y += 4;
   doc.text(`Cost Center: ${data.asset?.costcenter?.name || 'N/A'}`, pageWidth / 2 + 10, y);
   y += 4;
   doc.text(`Location: ${data.asset?.location?.name || 'N/A'}`, pageWidth / 2 + 10, y);

   // Service Items Table
   y += 10;
   doc.setFont('helvetica', 'bold');
   doc.setFontSize(10);
   doc.text(`Service Details`, 15, y);

   const tableData: MaintenanceInvoiceRow[] = [];
   if (data.parts && Array.isArray(data.parts)) {
      data.parts.forEach((part, index) => {
         tableData.push({
            no: index + 1,
            item: part.part_name || 'N/A',
            qty: part.part_qty || 0,
            unitPrice: parseFloat(part.part_uprice || '0'),
            discount: 0, // Not implemented yet
            subTotal: parseFloat(part.part_final_amount || '0')
         });
      });
   }

   const grandTotal = parseFloat(data.inv_total || '0');
   // Add table
   y += 3;
   autoTable(doc, {
      startY: y,
      head: [['No', 'Item', 'U/Price (RM)', 'Qty', 'SST', 'Discount', 'Sub-total (RM)']],
      body: tableData.map(row => [
         row.no,
         row.item,
         formatCurrency(row.unitPrice),
         row.qty,
         '0.00', // SST placeholder
         '0.00', // Discount placeholder
         formatCurrency(row.subTotal)
      ]),
      foot: [[{ content: '', colSpan: 5 }, 'Grand Total', '']], // value set below via footStyles.halign right
      theme: 'grid',
      headStyles: {
         fillColor: [41, 128, 185],
         textColor: 255,
         fontStyle: 'bold',
         fontSize: 9,
         halign: 'center'
      },
      bodyStyles: {
         fontSize: 8,
         cellPadding: 1
      },
      footStyles: {
         fillColor: [240, 240, 240],
         textColor: 0,
         fontStyle: 'bold',
         fontSize: 9,
         halign: 'right',
         lineWidth: 0.1,
         lineColor: [200, 200, 200]
      },
      columnStyles: {
         0: { cellWidth: 8, halign: 'center' }, // No.
         1: { cellWidth: 0, halign: 'left' },   // Item
         2: { cellWidth: 25, halign: 'right' }, // U/Price
         3: { cellWidth: 20, halign: 'center' },  // Qty
         4: { cellWidth: 20, halign: 'right' },  // SST
         5: { cellWidth: 20, halign: 'right' },  // Discount
         6: { cellWidth: 30, halign: 'right' }   // Sub-total
      },
      margin: { left: 14, right: 14 },
      didParseCell: (data: any) => {
         // inject grand total value into last foot column
         if (data.section === 'foot' && data.column.index === 6) {
            data.cell.text = [formatCurrency(grandTotal)];
         }
      }
   });

   // Position after table
   const tableEndY = (doc as any).lastAutoTable?.finalY || y + 50;
   const finalY = tableEndY + 4;
   y = finalY + 15;

   // Signatures area (reuse helper)
   y = ensurePageBreakForSignatures(doc, y, { signaturesHeight: 60, bottomMargin: 40, newPageTopMargin: 50 });
   // Appreciation message
   doc.setFont('helvetica', 'normal');
   doc.setFontSize(9);
   doc.text('Your cooperation on the above is highly appreciated', 15, y);

   // Signature section
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
         name: preparedByName || 'Prepared By',
         title: preparedByTitle || 'Administrator',
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

   // Update header/footer with correct page count
   const totalPages = doc.internal.pages.length - 1;
   for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      await addHeaderFooter(doc, i, totalPages, pageWidth);
   }
   return doc;
}

export function downloadMaintenanceReport(
   inv_id: number,
   options?: { preparedByName?: string; preparedByTitle?: string }
) {
   generateMaintenanceReport({ inv_id, ...options })
      .then(doc => {
         const now = new Date();
         const datetime = now.getFullYear().toString() +
            (now.getMonth() + 1).toString().padStart(2, '0') +
            now.getDate().toString().padStart(2, '0') +
            now.getHours().toString().padStart(2, '0') +
            now.getMinutes().toString().padStart(2, '0');
         doc.save(`maintenance-invoice-${inv_id}-${datetime}.pdf`);
      })
      .catch(error => {
         console.error('Error generating maintenance report:', error);
         throw error;
      });
}
