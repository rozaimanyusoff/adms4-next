/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { authenticatedApi } from '@/config/api';

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

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  // Default font size 9 for the entire document
  doc.setFontSize(9);
  let y = 10;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;

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
  // Dimensions for 3 columns similar to attachment (left wider)
  const contentW = pageWidth - margin * 2;
  const col1 = Math.round(contentW * 0.5);
  const col2 = Math.round(contentW * 0.25);
  const col3 = contentW - col1 - col2;

  // Top table as per attachment
  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2, lineColor: 20, lineWidth: 0.2 },
    head: [],
    body: [
      [
        { content: 'Borang Servis Kenderaan', styles: { fontStyle: 'bold', halign: 'center', fillColor: [0, 0, 0], textColor: 255, fontSize: 12 } },
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
        { content: `Daerah: ${(data?.asset?.location?.name || '-')}` },
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
  y = (doc as any).lastAutoTable.finalY + 4;

  // HRA Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Bahagian Jabatan HRA', margin, y);
  y += 3;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const hraTableBody: any[] = [];
  hraTableBody.push([
    { content: 'Butiran servis yang diluluskan:', styles: { fontStyle: 'bold' } },
    { content: 'Lain-lain permintaan', styles: { fontStyle: 'bold' } },
    { content: 'Keterangan Jabatan HRA:', styles: { fontStyle: 'bold' } },
  ]);
  hraTableBody.push([
    services.length ? services.join('\n') : '-',
    reqComment || '-',
    '—',
  ]);
  autoTable(doc, {
    startY: y,
    body: hraTableBody,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2, valign: 'top' },
    columnStyles: {
      0: { cellWidth: (pageWidth - margin * 2) * 0.33 },
      1: { cellWidth: (pageWidth - margin * 2) * 0.33 },
      2: { cellWidth: (pageWidth - margin * 2) * 0.34 },
    },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  // Workshop
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Bengkel Yang Diluluskan:', margin, y);
  doc.setFont('helvetica', 'bold');
  doc.text(workshop || '-', margin + 50, y);
  y += 6;

  // Workshop fill section
  doc.setFont('helvetica', 'bold');
  doc.text('Bahagian yang perlu dilengkapkan oleh pihak bengkel.', margin, y);
  y += 2;

  autoTable(doc, {
    startY: y + 2,
    head: [['No', 'Butiran Alat Ganti', 'Qty', 'Harga/Unit', 'Jumlah (RM)']],
    body: Array.from({ length: 10 }).map((_, i) => [String(i + 1), '', '', '', '']),
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 1.5, minCellHeight: 8 },
    headStyles: { fillColor: [240, 240, 240], textColor: 20 },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 100 },
      2: { cellWidth: 18 },
      3: { cellWidth: 30 },
      4: { cellWidth: 28 },
    },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Nota: Sekiranya tiada caj dikenakan, sila nyatakan FOC', margin, y);
  doc.text('Jumlah (RM): ____________________', pageWidth - margin, y, { align: 'right' });
  y += 8;

  // Signature boxes
  autoTable(doc, {
    startY: y,
    head: [[
      'Cop / TT Bengkel (Selepas Servis)**',
      'Pengesahan Oleh Pemohon/Pemandu (Selepas Servis)',
      'Diterima Oleh (Jabatan HRA)',
    ]],
    body: [[ '', '', '' ]],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [240, 240, 240], textColor: 20 },
    bodyStyles: { minCellHeight: 24 },
  });
  y = (doc as any).lastAutoTable.finalY + 2;

  // Footer notes
  const notesLeft = [
    'Notis kepada pemohon/pemandu:',
    '1) Borang penyelenggaraan ini hanya dikeluarkan setelah mendapat kelulusan sahaja. Oleh itu, tiada tanda tangan kelulusan diperlukan.',
    '2) Setelah penyelenggaraan selesai, pemohon hendaklah mengambil gambar borang yang penuh dan jelas serta memuat naik melalui pautan yang sertakan dalam emel “Muatnaik Borang Servis” dengan serta-merta.',
  ];
  const notesRight = [
    'Notis kepada bengkel:',
    '1) Sekiranya kos servis melebihi RM2,000.00, pihak bengkel hendaklah hubungi pegawai pengurusan RWS sebelum urusan selanjutnya dapat dilakukan.',
    '2) Borang ini perlu dilampirkan bersama invois untuk tujuan pembayaran.',
  ];
  doc.setFontSize(8.5);
  const colWidth = (pageWidth - margin * 2) / 2 - 2;
  let yy = y + 2;
  notesLeft.forEach((line) => {
    doc.text(line, margin, yy, { maxWidth: colWidth });
    yy += 4;
  });
  yy = y + 2;
  notesRight.forEach((line) => {
    doc.text(line, margin + colWidth + 6, yy, { maxWidth: colWidth });
    yy += 4;
  });

  const filename = `service-form-${reqId}-${reg}.pdf`;
  doc.save(filename);
}
