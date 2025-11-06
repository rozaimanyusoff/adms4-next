/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { authenticatedApi } from '@/config/api';

// ===============================
// Design & Layout Configuration
// Centralize all page, typography, and table styling here for easy tuning.
// Adjust values below to affect the entire document.
// ===============================
const PDF_STYLE = {
  page: {
    // Units & format used by jsPDF
    unit: 'mm' as const,
    format: 'a4' as const,
    // Page margins (horizontal) and initial top offset (y)
    marginX: 14, // left & right margins in mm
    topOffset: 10, // starting y position for content
  },
  typography: {
    // Global (non-table) font size
    base: 9,
    // Table font size (applies to most tables; specific cells can override)
    table: 8,
    // Section heading font size (HRA label, etc.)
    section: 8,
    // Title font size for the top-most document title cell
    title: 9,
    // Footer/notes font size
    footer: 7,
  },
  table: {
    // Default table styles for jspdf-autotable
    default: {
      fontSize: 8,
      cellPadding: 0.5,
      lineColor: 20,
      lineWidth: 0.1,
      valign: 'top' as const,
    },
    // Default header styling for tables
    head: { fillColor: [240, 240, 240] as [number, number, number], textColor: 20 },
    // Specific minimum heights
    parts: { minCellHeight: 5 }, // parts/pricing rows fillable area
    signature: { minCellHeight: 18 }, // signature boxes writing area
  },
} as const;

function formatDMY(value?: string | null) {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

async function loadImageElement(url?: string | null): Promise<HTMLImageElement | null> {
  if (!url) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function downloadServiceFormPdf(reqId: string | number) {
  const res: any = await authenticatedApi.get(`/api/mtn/request/${reqId}`);
  const data = res?.data?.data ?? res?.data;
  if (!data) throw new Error('NO_DATA');

  const reg = data?.asset?.register_number || data?.vehicle?.register_number || 'UNKNOWN';
  const brand = data?.asset?.brand?.name || '';
  const model = data?.asset?.model?.name || '';
  const requester = data?.requester || {};
  const department = data?.asset?.department?.name || requester?.department?.name || '';
  const workshop = data?.workshop?.name || '';
  const services: string[] = Array.isArray(data?.svc_type) ? data.svc_type.map((s: any, i: number) => `${i + 1}) ${s?.name ?? s}`) : [];
  const reqComment = data?.req_comment || '';
  const odoStart = (data?.odo_start != null) ? String(data.odo_start) : '-';
  const odoEnd = (data?.odo_end != null) ? String(data.odo_end) : '-';
  const verificationComment = data?.verification_comment || '-';

  // ===============================
  // Page Setup
  // ===============================
  const doc = new jsPDF({ unit: PDF_STYLE.page.unit, format: PDF_STYLE.page.format });
  // Global font size (non-table text)
  doc.setFontSize(PDF_STYLE.typography.base);
  let y = PDF_STYLE.page.topOffset;
  const pageWidth = doc.internal.pageSize.getWidth();
  // Horizontal margins
  const margin = PDF_STYLE.page.marginX;

  // Logo (top-left) and code (top-right)
  try {
    const logoUrl = process.env.NEXT_PUBLIC_BRAND_LOGO_LIGHT as string | undefined;
    const img = await loadImageElement(logoUrl || null);
    if (img) {
      const targetH = 10; // mm
      const ratio = img.width / img.height;
      const targetW = targetH * ratio;
      doc.addImage(img, 'PNG', margin, y, targetW, targetH);
    }
  } catch { /* ignore logo errors */ }
  doc.setFont('helvetica', 'normal');
  doc.text('RT/AD-011/Rev. 00', pageWidth - margin, y + 4, { align: 'right' });
  y += 12;

  // Top Details (two columns of label:value per row)
  // Layout: 3-column grid (left ~50%, middle ~25%, right ~25%)
  const contentW = pageWidth - margin * 2;
  const col1 = Math.round(contentW * 0.5);
  const col2 = Math.round(contentW * 0.25);
  const col3 = contentW - col1 - col2;

  // Top table as per attachment
  // Table: Header info at the top
  // Design: no cellpadding; table font size set to 8 (title cell overrides to 12)
  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: { ...PDF_STYLE.table.default },
    head: [],
    body: [
      [
        { content: 'Borang Servis Kenderaan', styles: { fontStyle: 'bold', halign: 'center', fillColor: [0, 0, 0], textColor: 255, fontSize: PDF_STYLE.typography.title } },
        { content: `No Pendaftaran: ${reg}`, styles: { fontStyle: 'bold' } },
        { content: `No Rujukan: ${data?.req_id ?? '-'}`, styles: { fontStyle: 'bold' } },
      ],
      [
        { content: `Pemohon: ${requester?.name || '-'}` },
        { content: `Telefon: ${requester?.contact || '-'}` },
        { content: `Tarikh Mohon: ${formatDMY(data?.req_date)}` },
      ],
      [
        { content: `Model Kenderaan: ${(brand || model) ? `${brand} ${model}`.trim() : '-'}` },
        { content: `Jabatan: ${department || '-'}` },
        { content: `Lokasi: ${(data?.asset?.location?.name || '-')}` },
      ],
      [
        { content: `Odometer Terkini / Servis Seterusnya: ${odoStart} / ${odoEnd}` },
        { content: `Tarikh Diluluskan: ${formatDMY(data?.approval_date)}` },
        { content: `Tempoh Kelulusan: ${data?.approval_date ? '1 hari' : '-'}` },
      ],
      [
        { content: `Komplen Pemandu: ${reqComment || '-'}`, colSpan: 3 },
        {},
        {},
      ],
    ],
    columnStyles: {
      0: { cellWidth: col1 },
      1: { cellWidth: col2 },
      2: { cellWidth: col3 },
    },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // HRA Section — approved service details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(PDF_STYLE.typography.section);
  doc.text('Bahagian Jabatan HRA', margin, y);
  y += 1;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(PDF_STYLE.typography.section);
  const hraTableBody: any[] = [];
  hraTableBody.push([
    { content: 'Butiran servis yang diluluskan:', styles: { fontStyle: 'bold' } },
    { content: 'Lain-lain permintaan', styles: { fontStyle: 'bold' } },
    { content: 'Keterangan Jabatan HRA:', styles: { fontStyle: 'bold' } },
  ]);
  hraTableBody.push([
    services.length ? services.join('\n') : '-',
    reqComment || '-',
    verificationComment
  ]);
  // Design: no cellpadding; table font size 8; cells top-aligned for multi-line lists
  autoTable(doc, {
    startY: y,
    body: hraTableBody,
    theme: 'grid',
    styles: { ...PDF_STYLE.table.default },
    headStyles: { ...PDF_STYLE.table.head },
    columnStyles: {
      0: { cellWidth: (pageWidth - margin * 2) * 0.33 },
      1: { cellWidth: (pageWidth - margin * 2) * 0.33 },
      2: { cellWidth: (pageWidth - margin * 2) * 0.34 },
    },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  //disclaimer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(PDF_STYLE.typography.base - 1);
  const disclaimerText = '* Borang ini hanya sah digunakan dalam tempoh 5 hari sahaja dari tarikh kelulusan, dan hanya sah digunakan mengikut butiran servis yang diluluskan sahaja. Sekiranya terdapat keperluan lain (yang berkaitan dengan penyelenggaraan ini), sila buat permohonan baru.';
  doc.text(disclaimerText, margin, y, { maxWidth: pageWidth - margin * 2 });
  y += 10;

  // Workshop
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(PDF_STYLE.typography.section);
  doc.text('Bengkel Yang Diluluskan:', margin, y);
  doc.setFont('helvetica', 'bold');
  doc.text(workshop || '-', margin + 40, y);
  // underline the workshop value
  try {
    const w = doc.getTextWidth(String(workshop || '-'));
    doc.setLineWidth(0.2);
    doc.line(margin + 40, y + 1.5, margin + 40 + w, y + 1.5);
  } catch (_) { /* ignore underline issues */ }
  y += 6;

  // Workshop fill section
  doc.setFont('helvetica', 'bold');
  doc.text('Bahagian yang perlu dilengkapkan oleh pihak bengkel.', margin, y);
  y += 1;

  // Workshop parts/pricing table — user-fillable rows
  // Design: no cellpadding; table font size 8; head styled lightly
  autoTable(doc, {
    startY: y + 1,
    head: [['No', 'Butiran Alat Ganti', 'Qty', 'Harga/Unit', 'Jumlah (RM)']],
    body: Array.from({ length: 15 }).map((_, i) => ['', '', '', '', '']),
    theme: 'grid',
    styles: { ...PDF_STYLE.table.default, minCellHeight: PDF_STYLE.table.parts.minCellHeight },
    headStyles: { ...PDF_STYLE.table.head },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 115 },
      2: { cellWidth: 15 },
      3: { cellWidth: 21 },
      4: { cellWidth: 21 },
    },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  //spare parts summary row
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(PDF_STYLE.typography.section);
  const noteY = y;
  // Left cell text with bold FOC
  const leftPrefix = 'Nota: Sekiranya tiada caj dikenakan, sila nyatakan ';
  const leftX = margin + 2; // small inner padding
  doc.text(leftPrefix, leftX, noteY);
  const prefixWidth = doc.getTextWidth(leftPrefix);
  doc.setFont('helvetica', 'bold');
  doc.text('FOC', leftX + prefixWidth, noteY);
  doc.setFont('helvetica', 'normal');
  // Right cell title centered and bold
  doc.setFont('helvetica', 'bold');
  // Column geometry calculated below — we center within the right cell
  // outline border for the note row
  try {
    doc.setLineWidth(0.2);
    const totalW = pageWidth - margin * 2;
    const boxH = 6;
    // Outer border
    doc.rect(margin, noteY - 4, totalW, boxH, 'S');
    // Two columns: left ~2/5, right ~3/5
    const leftW = Math.round(totalW * (8 / 9) - 1); // leave some padding
    const rightW = totalW - leftW;
    const dividerX = margin + leftW;
    doc.line(dividerX, noteY - 4, dividerX, noteY - 4 + boxH);
    const rightCenterX = dividerX + rightW / 2;
    doc.text('Jumlah (RM)', rightCenterX - 21, noteY, { align: 'center' });
  } catch (_) { /* ignore rect issues */ }
  y += 8;

  // Service meta (one row, 3 columns)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(PDF_STYLE.typography.section);
  const rowY = y;
  const totalW2 = pageWidth - margin * 2;
  const colW3 = totalW2 / 3;
  const padIn = 0; // inner padding per column
  // Helper to render label + bold placeholder within a column
  const renderField = (label: string, placeholder: string, x: number) => {
    doc.setFont('helvetica', 'normal');
    doc.text(label, x + padIn, rowY);
    const w = doc.getTextWidth(label + ' ');
    doc.setFont('helvetica', 'bold');
    doc.text(placeholder, x + padIn + w, rowY);
  };
  // Columns: [0] Tarikh Masuk, [1] Tarikh Siap, [2] Odometer Akhir
  renderField('Tarikh Masuk Bengkel:', '___/___/____', margin + 0 * colW3);
  renderField('Tarikh Siap Servis:', '___/___/____', margin + 1 * colW3);
  renderField('Odometer:', '____________', margin + 2 * colW3);
  y += 6;

  // Signature boxes — three equal columns
  // Design: no cellpadding; table font size 8; increased minCellHeight for writing space
  autoTable(doc, {
    startY: y,
    head: [[
      'Cop / TT Bengkel (Selepas Servis)**',
      'Pengesahan Oleh Pemohon/Pemandu (Selepas Servis)',
      'Diterima Oleh (Jabatan HRA)',
    ]],
    body: [[ '', '', '' ]],
    theme: 'grid',
    styles: { ...PDF_STYLE.table.default },
    headStyles: { ...PDF_STYLE.table.head },
    bodyStyles: { minCellHeight: PDF_STYLE.table.signature.minCellHeight },
  });
  y = (doc as any).lastAutoTable.finalY + 2;

  // Footer notes
  const notesLeft = [
    'Notis kepada pemohon/pemandu:',
    '1) Borang servis kenderaan ini hanya dikeluarkan setelah mendapat kelulusan sahaja. Oleh itu, tiada tanda tangan kelulusan diperlukan.',

    '2) Setelah servis kenderaan selesai, pemohon DIWAJIBKAN memuat naik borang yang telah diisi oleh bengkel serta-merta, melalui aplikasi ADMS4 yang sama digunakan semasa memohon.',

    '3) Pemohon hendaklah merujuk kepada pihak HRA terlebih dahulu sekiranya terdapat penambahan terhadap kerja penyelenggaraan, selain dari perkara yang tertera dalam borang ini.',
  ];
  const notesRight = [
    'Notis kepada bengkel:',
    '1) Sekiranya kos servis melebihi RM2,000.00, pihak bengkel hendaklah menghubungi Penyelia Pentadbiran RTSB sebelum sebarang urusan selanjutnya dijalankan.',
    
    '2) Borang ini perlu dilampirkan bersama invois untuk tujuan pembayaran.',
  ];
  // Draw footer notes as wrapped paragraphs per column to avoid overlap
  doc.setFontSize(PDF_STYLE.typography.footer);
  const colWidth = (pageWidth - margin * 2) / 2 - 2;
  const lineH = 3.6; // mm, line height for footer text
  // Left column
  let yL = y + 2;
  doc.setFont('helvetica', 'bold');
  const leftTitleLines = doc.splitTextToSize(notesLeft[0], colWidth) as string[];
  leftTitleLines.forEach((ln, idx) => doc.text(ln, margin, yL + idx * lineH));
  yL += leftTitleLines.length * lineH;
  doc.setFont('helvetica', 'normal');
  notesLeft.slice(1).forEach((paragraph) => {
    const wrapped = doc.splitTextToSize(paragraph, colWidth) as string[];
    wrapped.forEach((ln, idx) => doc.text(ln, margin, yL + idx * lineH));
    yL += wrapped.length * lineH;
  });
  // Right column
  let yR = y + 2;
  const rightX = margin + colWidth + 6;
  doc.setFont('helvetica', 'bold');
  const rightTitleLines = doc.splitTextToSize(notesRight[0], colWidth) as string[];
  rightTitleLines.forEach((ln, idx) => doc.text(ln, rightX, yR + idx * lineH));
  yR += rightTitleLines.length * lineH;
  doc.setFont('helvetica', 'normal');
  notesRight.slice(1).forEach((paragraph) => {
    const wrapped = doc.splitTextToSize(paragraph, colWidth) as string[];
    wrapped.forEach((ln, idx) => doc.text(ln, rightX, yR + idx * lineH));
    yR += wrapped.length * lineH;
  });

  // Watermark: mark as VOID when invoice exists (form no longer valid for use)
  try {
    const hasInvoice = !!(data as any)?.invoice;
    if (hasInvoice) {
      const pageCount = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : 1;
      for (let p = 1; p <= pageCount; p++) {
        if ((doc as any).setPage) (doc as any).setPage(p);
        const pW = doc.internal.pageSize.getWidth();
        const pH = doc.internal.pageSize.getHeight();
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(72);
        // Light red watermark to avoid overpowering content
        doc.setTextColor(210, 40, 40);
        doc.text('VOID', pW / 2, pH / 2, { align: 'center', angle: 30 });
        doc.setTextColor(0);
      }
    }
  } catch (_) { /* ignore watermark issues */ }

  // App signature at the very bottom center
  try {
    const pageCount = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : 1;
    const pageH = doc.internal.pageSize.getHeight();
    const centerX = pageWidth / 2;
    for (let p = 1; p <= pageCount; p++) {
      if ((doc as any).setPage) (doc as any).setPage(p);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(Math.max(8, PDF_STYLE.typography.footer - 3));
      doc.setTextColor(120);
      doc.text('- ADMS4 -', centerX, pageH - 4, { align: 'center' });
    }
    doc.setTextColor(0);
  } catch (_) { /* ignore signature issues */ }

  const filename = `service-form-${reqId}-${reg}.pdf`;
  doc.save(filename);
}
