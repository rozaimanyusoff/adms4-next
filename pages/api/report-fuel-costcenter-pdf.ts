import type { NextApiRequest, NextApiResponse } from 'next';
import { generateFuelCostCenterReportPuppeteer } from '@/components/billings/report-fuel-costcenter-puppeteer';

export const config = {
  api: {
    bodyParser: true,
    sizeLimit: '2mb',
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const pdfProps = req.body;
    // Generate PDF using Puppeteer
    const pdfBuffer = await generateFuelCostCenterReportPuppeteer(pdfProps);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="fuel-costcenter-report.pdf"');
    res.status(200).send(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'PDF generation failed' });
  }
}
