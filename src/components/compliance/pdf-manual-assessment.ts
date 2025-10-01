// Utility to open a printable blank manual assessment form in a new tab
// Includes HTML with a Print and Save PDF toolbar (via html2pdf CDN)

import { authenticatedApi } from '@/config/api';

export type ManualFormOptions = {
  title?: string;
  prefill?: {
    date?: string;
    vehicleNo?: string;
    driverId?: string;
    driverName?: string;
    location?: string;
  };
  rows?: number; // fallback number of blank rows if criteria not available
  ownership?: number; // e.g., 9
  status?: string; // e.g., 'active'
};

type CriteriaItem = {
  qset_id?: number;
  q_id?: number;
  qset_quesno?: number;
  qset_desc?: string;
  qset_stat?: string;
  qset_type?: string; // 'NCR' | 'SELECTION' | 'RATING' | etc
  qset_order?: number;
  ownership?: number;
};

export async function openManualAssessmentForm(opts: ManualFormOptions = {}) {
  const title = opts.title || 'Vehicle Assessment Manual Form';
  const rows = Math.max(15, Math.min(40, opts.rows ?? 20));
  const pre = opts.prefill || {};
  const ownership = opts.ownership ?? 9;
  const status = opts.status ?? 'active';

  const safe = (v?: string) => (v ? String(v) : '');

  // Open window immediately (from user gesture) to avoid popup blockers
  const w = typeof window !== 'undefined' ? window.open('', '_blank') : null;
  if (w) {
    w.document.open();
    w.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>${title}</title>
      <style>body{font-family:Inter,ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:20px;font-size:12px;color:#111827}</style>
    </head><body>Preparing manual form…</body></html>`);
    w.document.close();
  }

  // Helper to render assessment choices by type
  const renderAssessmentCell = (typeRaw?: string) => {
    const type = (typeRaw || '').toUpperCase();
    if (type === 'NCR') {
      return '<span class="choice">N/A<span class="box"></span></span><span class="choice">Comply<span class="box"></span></span><span class="choice">Not-comply<span class="box"></span></span>';
    }
    if (type === 'RATING') {
      // 4 empty stars and N/A option (larger)
      return '<span class="choice">N/A<span class="box"></span></span><span class="stars">☆ ☆ ☆ ☆</span>';
    }
    if (type === 'SELECTION') {
      return '<span class="choice">N/A<span class="box"></span></span><span class="choice">Equipped<span class="box"></span></span><span class="choice">Missing<span class="box"></span></span>';
    }
    return '&nbsp;';
  };

  // Try fetch criteria; fallback to blank rows if not available
  let rowsHtml = '';
  try {
    const res = await authenticatedApi.get('/api/compliance/assessments/criteria', {
      params: { status, ownership }
    });
    const list: CriteriaItem[] = Array.isArray((res as any)?.data?.data)
      ? (res as any).data.data
      : (Array.isArray((res as any)?.data) ? (res as any).data : []);

    if (list && list.length > 0) {
      rowsHtml = list
        .sort((a, b) => (Number(a.qset_order ?? a.qset_quesno ?? 0) - Number(b.qset_order ?? b.qset_quesno ?? 0)))
        .map((it, idx) => `
          <tr>
            <td style="border:1px solid #e5e7eb;padding:6px;text-align:center">${idx + 1}</td>
            <td style="border:1px solid #e5e7eb;padding:6px">${it.qset_desc || ''}</td>
            <td style="border:1px solid #e5e7eb;padding:6px;text-align:center">${(it.qset_type || '').toUpperCase()}</td>
            <td style="border:1px solid #e5e7eb;padding:6px;text-align:center">${renderAssessmentCell(it.qset_type)}</td>
            <td style="border:1px solid #e5e7eb;padding:6px">&nbsp;</td>
          </tr>
        `).join('');
    }
  } catch (e) {
    // ignore and fallback
  }

  if (!rowsHtml) {
    rowsHtml = Array.from({ length: rows }).map((_, i) => `
      <tr>
        <td style="border:1px solid #e5e7eb;padding:6px;text-align:center">${i + 1}</td>
        <td style="border:1px solid #e5e7eb;padding:6px">&nbsp;</td>
        <td style="border:1px solid #e5e7eb;padding:6px;text-align:center">NCR / SELECTION / RATING</td>
        <td style="border:1px solid #e5e7eb;padding:6px;text-align:center"><span class="choice">N/A<span class="box"></span></span><span class="choice">Comply<span class="box"></span></span><span class="choice">Not-comply<span class="box"></span></span></td>
        <td style="border:1px solid #e5e7eb;padding:6px">&nbsp;</td>
      </tr>
    `).join('');
  }

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body{font-family:Inter,ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif; padding:12px 10px; font-size:10px; color:#111827}
    table{border-collapse:collapse;width:100%;font-size:10px}
    thead{background:#f9fafb}
    th,td{border:1px solid #e5e7eb;padding:5px;text-align:left}
    .toolbar{display:flex;gap:8px;margin-bottom:12px}
    .btn{padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;background:#f3f4f6;cursor:pointer}
    .btn.red{background:#fee2e2;border-color:#fecaca;color:#991b1b}
    .header{background:#2d2d2d;color:#fff;padding:6px 10px;font-weight:600}
    .section-title{margin:10px 0 6px 0;font-weight:600}
    .note{margin-top:8px;font-size:10px;color:#374151}
    /* Larger printable checkboxes */
    .choice{display:inline-flex;align-items:center;margin-right:14px;white-space:nowrap}
    .box{display:inline-block;width:14px;height:14px;border:2px solid #374151;border-radius:2px;margin:0 6px 0 4px;vertical-align:middle}
    .stars{font-size:14px;letter-spacing:2px}
    @media print{ .toolbar{ display:none } @page{ size:A4 portrait; margin:10mm 8mm } }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js"></script>
</head>
<body>
  <div class="toolbar">
    <button class="btn red" onclick="window.close()">Close</button>
    <button class="btn" onclick="window.print()">Print</button>
    <button class="btn" onclick="(function(){
      const el = document.getElementById('form-root');
      if (!window.html2pdf || !el) { window.print(); return; }
      window.html2pdf().from(el).set({ margin: 10, filename: 'assessment-manual-form.pdf', image:{ type:'jpeg', quality:0.98 }, html2canvas:{ scale:2, useCORS:true }, jsPDF:{ unit:'mm', format:'a4', orientation:'portrait' } }).save();
    })()">Save PDF</button>
  </div>

  <div id="form-root">
    <div class="header">${title}</div>

    <table style="margin-top:6px">
      <tbody>
        <tr>
          <td style="border:1px solid #cbd5e1;padding:6px;width:20%">Assessment Date:</td>
          <td style="border:1px solid #cbd5e1;padding:6px;width:30%">${safe(pre.date)}</td>
          <td style="border:1px solid #cbd5e1;padding:6px;width:20%">Driver's:</td>
          <td style="border:1px solid #cbd5e1;padding:6px;width:30%">${safe(pre.driverName)}</td>
        </tr>
        <tr>
          <td style="border:1px solid #cbd5e1;padding:6px">Assessed Location:</td>
          <td style="border:1px solid #cbd5e1;padding:6px">${safe(pre.location)}</td>
          <td style="border:1px solid #cbd5e1;padding:6px">Driver's Employee ID:</td>
          <td style="border:1px solid #cbd5e1;padding:6px">${safe(pre.driverId)}</td>
        </tr>
        <tr>
          <td style="border:1px solid #cbd5e1;padding:6px">Vehicle Registration No:</td>
          <td style="border:1px solid #cbd5e1;padding:6px">${safe(pre.vehicleNo)}</td>
          <td style="border:1px solid #cbd5e1;padding:6px">Vehicle Make/Model:</td>
          <td style="border:1px solid #cbd5e1;padding:6px">&nbsp;</td>
        </tr>
      </tbody>
    </table>

    <div class="section-title">Assessment Items</div>
    <table>
      <thead>
        <tr>
          <th style="width:5%">No</th>
          <th>Description</th>
          <th style="width:14%">Type</th>
          <th style="width:41%">Assessment</th>
          <th style="width:20%">Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="section-title">Summary</div>
    <table>
      <tbody>
        <tr>
          <td style="border:1px solid #e5e7eb;padding:6px;width:25%">Comply:</td>
          <td style="border:1px solid #e5e7eb;padding:6px;width:25%">&nbsp;</td>
          <td style="border:1px solid #e5e7eb;padding:6px;width:25%">Not-comply (NCR):</td>
          <td style="border:1px solid #e5e7eb;padding:6px;width:25%">&nbsp;</td>
        </tr>
        <tr>
          <td style="border:1px solid #e5e7eb;padding:6px">Rate (%):</td>
          <td style="border:1px solid #e5e7eb;padding:6px">&nbsp;</td>
          <td style="border:1px solid #e5e7eb;padding:6px">Overall Remarks:</td>
          <td style="border:1px solid #e5e7eb;padding:6px">&nbsp;</td>
        </tr>
      </tbody>
    </table>

    <div class="section-title">Acknowledgement</div>
    <table>
      <tbody>
        <tr>
          <td style="border:1px solid #e5e7eb;padding:16px;height:60px">Assessor Signature & Date</td>
          <td style="border:1px solid #e5e7eb;padding:16px;height:60px">Driver Signature & Date</td>
        </tr>
      </tbody>
    </table>

    <div class="note">Skala: 1-Tidak Memuaskan / Tidak Berfungsi 2-Memuaskan 3-Baik 4-Cemerlang / Berfungsi Dengan Baik</div>
  </div>
</body>
</html>`;

  if (w) { w.document.open(); w.document.write(html); w.document.close(); }
}
