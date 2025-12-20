import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { authenticatedApi } from '@/config/api';
import { HEADER_TOP_Y, addHeaderFooter, ensurePageBreakForSignatures } from './pdf-helpers';

type MaintenanceReportData = {
	inv_id: number;
	inv_no: string;
	inv_date: string;
	svc_order: string;
	service_details?: string | null;
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
	parts?: Array<{
		part_name: string;
		part_qty: number;
		part_uprice: string;
		part_amount: string;
		part_final_amount: string;
	}>;
};

const timestamp = () => {
	const now = new Date();
	return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
};

// Shared helpers (duplicated from single invoice generator to avoid circular exports)
const formatDate = (dateInput: string | Date | undefined): string => {
	if (!dateInput) return '';
	const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
	const day = String(d.getDate()).padStart(2, '0');
	const month = String(d.getMonth() + 1);
	const year = d.getFullYear();
	return `${day}/${month}/${year}`;
};

const formatCurrency = (amount: string | number): string => {
	const num = typeof amount === 'string' ? parseFloat(amount) : amount;
	if (isNaN(num)) return '0.00';
	return num.toLocaleString('en-MY', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
};

const fetchMaintenanceBillsBulk = async (invIds: number[]): Promise<MaintenanceReportData[]> => {
	const uniqueIds = Array.from(new Set(invIds.filter(Boolean)));
	if (uniqueIds.length === 0) return [];

	// API accepts either array or comma-separated string
	const payload = { ids: uniqueIds };
	const res = await authenticatedApi.post('/api/bills/mtn', payload);
	const raw = res?.data as any;
	if (raw && Array.isArray(raw.data)) return raw.data as MaintenanceReportData[];
	if (Array.isArray(raw)) return raw as MaintenanceReportData[];
	if (raw?.status === 'success' && Array.isArray(raw?.data)) return raw.data as MaintenanceReportData[];
	return [];
};

const renderMaintenanceInvoice = (
	doc: jsPDF,
	dataList: MaintenanceReportData[],
	options?: { preparedByName?: string; preparedByTitle?: string }
) => {
	const pageWidth = doc.internal.pageSize.getWidth();
	const preparedByName = options?.preparedByName || 'Prepared By';
	const preparedByTitle = options?.preparedByTitle || 'Administrator';

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(18);
	doc.text('M E M O', pageWidth / 15, 24, { align: 'left' });
	doc.setFontSize(9);
	doc.setFont('helvetica', 'normal');
	doc.text('Our Ref : RT/HRA/AD/F02/10', 15, 34);
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
	const workshopName = dataList[0]?.workshop?.name || 'N/A';
	doc.text(`VEHICLE MAINTENANCE BILLING - ${workshopName}`, 15, 64);
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(9);
	doc.text(`Kindly please make a payment as follows:`, 15, 70);

	let y = 78;
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(10);
	doc.text(`Service Details`, 15, y);

	const tableBody = dataList.map((item, idx) => [
		idx + 1,
		item.svc_order || 'N/A',
		item.inv_no || 'N/A',
		item.asset?.register_number || 'N/A',
		item.service_details || 'N/A',
		item.asset?.costcenter?.name || 'N/A',
		formatCurrency(parseFloat(item.inv_total || '0')),
	]);

	const grandTotal = dataList.reduce((sum, item) => sum + (parseFloat(item.inv_total || '0') || 0), 0);
	const totalInvoices = tableBody.length;
	const rowPageMap: Record<number, number> = {};

	y += 3;
	autoTable(doc, {
		startY: y,
		head: [['No', 'Request No', 'Invoice No', 'Vehicle', 'Service Details', 'Cost Ctr', 'Sub-Total (RM)']],
		body: tableBody,
			// Footer spans No through Cost Ctr, amount in last column
			foot: [[{ content: 'Grand Total', colSpan: 6 }, formatCurrency(grandTotal)]],
		showFoot: 'everyPage',
		theme: 'grid',
		headStyles: {
			fillColor: [41, 128, 185],
			textColor: 255,
			fontStyle: 'bold',
			fontSize: 9,
			halign: 'center',
		},
		bodyStyles: {
			fontSize: 8,
			cellPadding: 1.5,
			valign: 'middle',
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
		columnStyles: {
			0: { cellWidth: 10, halign: 'center' },
			1: { cellWidth: 25, halign: 'center' },
			2: { cellWidth: 30, halign: 'center' },
			3: { cellWidth: 25, halign: 'center' },
			4: { cellWidth: 0, halign: 'left' },
			5: { cellWidth: 25, halign: 'center' },
			6: { cellWidth: 30, halign: 'right' },
		},
		// Leave space for header/footer on page breaks
		margin: { left: 14, right: 14, top: HEADER_TOP_Y, bottom: 50 },
		didParseCell: (hookData: any) => {
			// Inject invoice count into the blank footer cell on multi-page tables
			if (hookData.section === 'foot' && hookData.column.index === 0) {
				const table = hookData.table as any;
				const pageCount = table?.pageCount || 1;
				
				if (pageCount > 1) {
					const currentPage = table?.pageNumber || 1;
					let cumulativeCount = Object.values(rowPageMap).filter(p => p <= currentPage).length;
					if (Array.isArray(table?.body)) {
						const bodyCount = table.body.filter((row: any) => (row.pageNumber || 1) <= currentPage).length;
						cumulativeCount = Math.max(cumulativeCount, bodyCount);
					}
					const label = `${cumulativeCount} of ${totalInvoices} invoices`;
					hookData.cell.text = [label];
					hookData.cell.styles.halign = 'center';
					hookData.cell.styles.fontStyle = 'normal';
				}
			}
		},
		didDrawCell: hookData => {
			// Track which page each row is drawn on
			if (hookData.section === 'body' && typeof hookData.row.index === 'number') {
				const tablePage = hookData.table?.pageNumber || 1;
				rowPageMap[hookData.row.index] = tablePage;
				(hookData.row as any).pageNumber = tablePage; // ensure available in later hooks
			}
		},
	});

	// Signatures (match single-invoice memo style)
	const tableEndY = (doc as any).lastAutoTable?.finalY || (doc as any).previousAutoTable?.finalY || y + 40;
	let sigY = tableEndY + 10;
	sigY = ensurePageBreakForSignatures(doc, sigY, { signaturesHeight: 60, bottomMargin: 40, newPageTopMargin: 60 });

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(9);
	doc.text('Your cooperation on the above is highly appreciated.', 15, sigY);

	sigY += 15;
	doc.setFont('helvetica', 'bold');
	doc.text('Ranhill Technologies Sdn. Bhd.', 15, sigY);
	sigY += 8;
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(9);
	doc.text('Prepared by,', 15, sigY);
	doc.text('Checked by,', pageWidth / 2 - 28, sigY);
	doc.text('Approved by,', pageWidth - 73, sigY);
	sigY += 15;
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(9);
	const signatures = [
		{
			name: preparedByName,
			title: preparedByTitle,
			x: 15,
		},
		{ name: 'MUHAMMAD ARIF BIN ABDUL JALIL', title: 'Senior Executive Administration', x: pageWidth / 2 - 28 },
		{ name: 'KAMARIAH BINTI YUSOF', title: 'Head of Human Resources and Administration', x: pageWidth - 73 },
	];
	signatures.forEach(sig => {
		doc.text(String(sig.name || '').toUpperCase(), sig.x, sigY);
	});
	sigY += 5;
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(9);
	signatures.forEach(sig => {
		doc.text(sig.title, sig.x, sigY);
	});
	sigY += 5;
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(9);
	doc.text('Date:', 15, sigY);
	doc.text('Date:', pageWidth / 2 - 28, sigY);
	doc.text('Date:', pageWidth - 73, sigY);
};

export const generateMaintenanceReportBulk = async (
	invIds: number[],
	options?: { preparedByName?: string; preparedByTitle?: string }
) => {
	const dataList = await fetchMaintenanceBillsBulk(invIds);
	if (!dataList.length) throw new Error('No maintenance bills found for the selected invoices.');

	const doc = new jsPDF();
	const pageWidth = doc.internal.pageSize.getWidth();

	// Add header/footer (with logo) before rendering content, similar to single-invoice memo
	await addHeaderFooter(doc, 1, 1, pageWidth);
	renderMaintenanceInvoice(doc, dataList, options);

	const totalPages = doc.internal.pages.length - 1;
	for (let i = 1; i <= totalPages; i++) {
		doc.setPage(i);
		const width = doc.internal.pageSize.getWidth();
		await addHeaderFooter(doc, i, totalPages, width);
	}

	return doc;
};

export async function downloadMaintenanceReportBulk(
	invIds: number[],
	options?: { preparedByName?: string; preparedByTitle?: string }
) {
	const uniqueIds = Array.from(new Set(invIds.filter(Boolean)));
	if (uniqueIds.length === 0) return;

	const doc = await generateMaintenanceReportBulk(uniqueIds, options);
	doc.save(`maintenance-invoices-${timestamp()}.pdf`);
}
