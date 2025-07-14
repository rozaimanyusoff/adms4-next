import puppeteer from 'puppeteer';

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

/**
 * Generates a PDF report for fuel cost center using Puppeteer (HTML/CSS rendering).
 * Returns a Buffer containing the PDF file.
 * Usage: Only works in Node.js server-side (API route, server action, etc).
 */
export async function generateFuelCostCenterReportPuppeteer({
    date,
    refNo,
    rows,
    subTotal,
    rounding,
    discount,
    grandTotal,
}: FuelCostCenterReportProps): Promise<Buffer> {
    // HTML template for the report
    const html = `
    <html>
    <head>
        <style>
            body { font-family: Helvetica, Arial, sans-serif; font-size: 12px; margin: 40px; }
            .header { font-weight: bold; font-size: 22px; margin-bottom: 10px; }
            .memo-title { font-size: 16px; font-weight: bold; margin-top: 20px; }
            .section { margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #333; padding: 4px 8px; font-size: 12px; }
            th { background: #222; color: #fff; }
            .right { text-align: right; }
            .center { text-align: center; }
            .footer { margin-top: 40px; font-size: 11px; }
            .signatures { margin-top: 30px; }
            .sign-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .sign-col { width: 32%; text-align: center; }
            .logo-footer { display: block; margin: 30px auto 0 auto; max-width: 215px; height: 26px; }
        </style>
    </head>
    <body>
        <div class="header">M E M O</div>
        <div class="section">Our Ref : ${refNo}</div>
        <div class="section">Date : ${date}</div>
        <div class="section">To: Head of Finance</div>
        <div class="section">Of: Ranhill Technologies Sdn Bhd</div>
        <div class="section">Copy:</div>
        <div class="section">From: Human Resource & Administration</div>
        <div class="section">Of: Ranhill Technologies Sdn Bhd</div>
        <div class="memo-title">FUEL BILLS - JUNE 2025</div>
        <div class="section">Kindly please make a payment to as follows:</div>
        <table>
            <thead>
                <tr>
                    <th class="center">No.</th>
                    <th>Cost Center</th>
                    <th class="right">Total Amount</th>
                </tr>
            </thead>
            <tbody>
                ${rows.map(row => `
                    <tr>
                        <td class="center">${row.no}</td>
                        <td>${row.costCenter}</td>
                        <td class="right">${row.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div class="section right">Sub-Total: ${subTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        <div class="section right">Inv. Rounding: ${rounding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        <div class="section right">Adjustment/Rebate: ${discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        <div class="section right"><b>Grand-Total: ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b></div>
        <div class="section">The payment shall be made before 10th.</div>
        <div class="section">Your cooperation on the above is highly appreciated</div>
        <div class="section"><b>Ranhill Technologies Sdn. Bhd.</b></div>
        <div class="signatures">
            <div class="sign-row">
                <div class="sign-col">Prepared by,<br><b>NUR AUFA FIRZANA BINTI SINANG</b><br>Admin Assistant<br>Date:</div>
                <div class="sign-col">Checked by,<br><b>MUHAMMAD ARIF BIN ABDUL JALIL</b><br>Senior Executive Administration<br>Date:</div>
                <div class="sign-col">Approved by,<br><b>KAMARIAH BINTI YUSOF</b><br>Head of Human Resources and Administration<br>Date:</div>
            </div>
        </div>
        ${process.env.NEXT_PUBLIC_REPORT_FOOTER_LOGO ? `<img src="${process.env.NEXT_PUBLIC_REPORT_FOOTER_LOGO}" class="logo-footer" />` : ''}
    </body>
    </html>
    `;

    // Launch Puppeteer and generate PDF
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '30px', bottom: '30px', left: '30px', right: '30px' } });
    await browser.close();
    return Buffer.from(pdfBuffer);
}
