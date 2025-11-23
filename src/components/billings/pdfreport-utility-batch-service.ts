import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { authenticatedApi } from '@/config/api';
import { addHeaderFooter, ensurePageBreakForSignatures } from './pdf-helpers';

type AnyRow = Record<string, any>;

function formatDate(dateInput: string | Date | undefined): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1);
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatMonthYearLabel(input?: string | null): string {
  if (input) {
    const [year, month] = input.split('-').map((part) => Number(part));
    if (Number.isFinite(year) && Number.isFinite(month)) {
      const d = new Date(year, month - 1, 1);
      return d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
    }
  }
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return prev.toLocaleString(undefined, { month: 'long', year: 'numeric' });
}

type BatchExportOptions = {
  billMonthIso?: string;
  serviceLabel?: string;
  preparedByName?: string;
  preparedByTitle?: string;
};

// Accepts the actual selected grid rows so we can discover their beneficiary IDs and util IDs
export async function exportUtilityBillBatchByService(selectedRows: AnyRow[], options: BatchExportOptions = {}) {
  try {
    if (!Array.isArray(selectedRows) || selectedRows.length === 0) {
      toast.error('No rows selected for service batch export.');
      return;
    }

    // Group util IDs by service and fetch via new endpoint
    const idsByService = new Map<string, number[]>();
    selectedRows.forEach((r) => {
      const utilId = Number(r?.util_id);
      const service = String(r?.account?.service || r?.service || 'Unknown');
      if (!utilId) return;
      idsByService.set(service, [...(idsByService.get(service) || []), utilId]);
    });

    if (idsByService.size === 0) {
      toast.error('Could not determine services for selected rows.');
      return;
    }

    // Fetch full bill objects per service
    const byService = new Map<string, AnyRow[]>();
    for (const [service, ids] of idsByService.entries()) {
      try {
        const endpoint = `/api/bills/util/by-ids?service=${encodeURIComponent(service)}`;
        const res = await authenticatedApi.post(
          endpoint,
          JSON.stringify({ ids }),
          { headers: { 'Content-Type': 'application/json' } }
        );
        const payload = (res as any)?.data || {};
        const bills = payload?.data || [];
        if (Array.isArray(bills) && bills.length) {
          byService.set(service, bills);
        }
      } catch (e) {
        console.error('Failed to fetch bills for service', service, e);
      }
    }

    if (byService.size === 0) {
      toast.error('No bill data found for selected rows.');
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Optional brand logo
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
      } catch (_) {}
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('M E M O', pageWidth / 15, 24, { align: 'left' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const refUtil = String(selectedRows[0]?.util_id ?? 'N/A');
    doc.text(`Our Ref : Mixed Beneficiaries (${refUtil})`, 15, 34);
    const currentDate = new Date();
    doc.text(`Date : ${formatDate(currentDate)}`, pageWidth - 70, 34, { align: 'right' });
    doc.text('To      : Head of Finance', 15, 44);
    doc.text('Of      : Ranhill Technologies Sdn Bhd', pageWidth - 95, 44, { align: 'left' });
    doc.text('Copy  :', 15, 48);
    doc.text('Of      :', pageWidth - 95, 48, { align: 'left' });
    doc.text(`From  : Human Resource and Administration`, 15, 52);
    doc.text('Of      : Ranhill Technologies Sdn Bhd', pageWidth - 95, 52, { align: 'left' });

    // Title uses month roll-forward style similar to other reports
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const services = Array.from(byService.keys()).sort((a, b) => a.localeCompare(b));
    const serviceTitle = options.serviceLabel
      ? options.serviceLabel
      : services.length === 1
        ? services[0]
        : 'Mixed Services';
    const billMonthYear = formatMonthYearLabel(options.billMonthIso);
    doc.text(`${String(serviceTitle || 'Utility').toUpperCase()} BILLS - ${billMonthYear}`, 15, 64);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Kindly please make a payment as follows:`, 15, 70);

    let y = 75;
    let overallGrandTotal = 0;

    // For each service group, render its own compact table and a subtotal
    for (const service of services) {
      const bills = byService.get(service) || [];
      if (!bills.length) continue;

      // Add service header
      //doc.setFont('helvetica', 'bold');
      //doc.text(String(service).toUpperCase(), 15, y);
      //y += 4;

      const tableHead = [['No', 'Account No', 'Date', 'Bill/Inv No', 'Beneficiary', 'Cost Center', 'Total (RM)']];
      let rowNum = 1;
      const tableBody = bills.map((bill: AnyRow) => [
        String(rowNum++),
        bill.account?.account || '',
        bill.ubill_date ? formatDate(bill.ubill_date) : '',
        bill.ubill_no || '',
        bill.account?.beneficiary?.name || '',
        bill.account?.costcenter?.name || '-',
        Number(bill.ubill_gtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })
      ]);

      autoTable(doc, {
        startY: y,
        head: tableHead,
        body: tableBody,
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 1 },
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
      });
      y = (doc as any).lastAutoTable.finalY + 4;

      const serviceSubtotal = bills.reduce((sum: number, bill: AnyRow) => sum + Number(bill.ubill_gtotal || 0), 0);
      overallGrandTotal += serviceSubtotal;

      // Subtotal row for this service
      const colWidths = [10, 35, 23, 35, 27, 26, 25];
      const totalTableWidth = colWidths.reduce((a, b) => a + b, 0);
      const xStart = 14;
      const rowHeight = 6;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(200);
      doc.setLineWidth(0.1);
      doc.rect(xStart, y - 4, totalTableWidth, rowHeight, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Service Subtotal:', xStart + totalTableWidth - 28, y, { align: 'right' });
      doc.text(serviceSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 }), xStart + totalTableWidth - 1, y, { align: 'right' });
      y += 8;

      // Page break guard before next service section
      if (y > doc.internal.pageSize.getHeight() - 80) {
        doc.addPage();
        y = 20; // top margin for new page
      }
    }

    // Overall grand total
    //doc.setFont('helvetica', 'bold');
    //doc.setFontSize(10);
    //doc.text(`OVERALL GRAND TOTAL: RM ${overallGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 15, y);
    //y += 12;

    // Signatures block
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
    // Try using preparer from any bill beneficiary if available; otherwise fall back
    const firstService = services[0];
    const sampleBill = firstService ? (byService.get(firstService) || [])[0] : undefined;
    const firstMeta = sampleBill?.account?.beneficiary || {};
    const signatures = [
      {
        name: options.preparedByName || firstMeta?.entry_by?.full_name || 'Prepared By',
        title: options.preparedByTitle || firstMeta?.entry_position || 'Administrator',
        x: 15,
      },
      { name: 'MUHAMMAD ARIF BIN ABDUL JALIL', title: 'Senior Executive Administration', x: pageWidth / 2 - 28 },
      { name: 'KAMARIAH BINTI YUSOF', title: 'Head of Human Resources and Administration', x: pageWidth - 73 },
    ];
    signatures.forEach((sig) => doc.text(String(sig.name || '').toUpperCase(), sig.x, y));
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    signatures.forEach((sig) => doc.text(String(sig.title || ''), sig.x, y));
    y += 5;
    doc.text('Date:', 15, y);
    doc.text('Date:', pageWidth / 2 - 28, y);
    doc.text('Date:', pageWidth - 73, y);
    y += 10;

    // Header/footer across pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      // eslint-disable-next-line no-await-in-loop
      await addHeaderFooter(doc, i, totalPages, pageWidth);
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    const tsNow = new Date();
    const timestamp = `${tsNow.getFullYear()}${pad(tsNow.getMonth() + 1)}${pad(tsNow.getDate())}${pad(tsNow.getHours())}${pad(tsNow.getMinutes())}${pad(tsNow.getSeconds())}`;
    doc.save(`utility-bills-service-batch-${timestamp}.pdf`);
    toast.success('Service batch PDF downloaded!');
  } catch (err) {
    console.error('exportUtilityBillBatchByService error', err);
    toast.error('Failed to export service batch PDF.');
  }
}
