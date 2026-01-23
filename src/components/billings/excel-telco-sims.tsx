'use client';

import React, { useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import ExcelJS from 'exceljs';
import { toast } from 'sonner';

interface SimCard {
	id?: number;
	sim_sn?: string;
	status?: string | null;
	reason?: string | null;
	replacement_sim?: { id?: number; sim_sn?: string } | number | null;
	activated_at?: string | null;
	deactivated_at?: string | null;
	subs?: { sub_no?: string; account_sub?: string } | null;
	account?: { account_master?: string; provider?: string } | null;
	user?: { full_name?: string; ramco_id?: string } | null;
	asset?: { register_number?: string } | null;
	location?: { name?: string } | null;
	department?: { name?: string } | null;
	costcenter?: { name?: string } | null;
	effective_date?: string | null;
	sim_user_history?: Array<{
		effective_date?: string;
		user?: { full_name?: string; ramco_id?: string } | string;
		department?: { name?: string };
		costcenter?: { name?: string };
		location?: { name?: string };
	}> | null;
	sim_asset_history?: Array<{
		effective_date?: string;
		asset?: { register_number?: string };
		register_number?: string;
	}> | null;
}

const pad = (n: number) => n.toString().padStart(2, '0');

const formatDate = (value?: string | null) => {
	if (!value) return '';
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-GB');
};

const ExcelTelcoSims: React.FC = () => {
	const [loading, setLoading] = useState(false);

	const handleExport = async () => {
		setLoading(true);
		try {
			const res = await authenticatedApi.get('/api/telco/sims');
			const json = res.data as { status?: string; data?: SimCard[] };
			const sims = Array.isArray(json?.data) ? json.data : [];
			if (!sims.length) {
				toast.info('No SIM data to export');
				return;
			}

			const workbook = new ExcelJS.Workbook();
			const sheet = workbook.addWorksheet('Telco SIMs');
			sheet.columns = [
				{ header: 'No', key: 'no', width: 6 },
				{ header: 'SIM Serial', key: 'sim_sn', width: 18 },
				{ header: 'Status', key: 'status', width: 12 },
				{ header: 'Reason', key: 'reason', width: 14 },
				{ header: 'Replacement Of', key: 'replacement_sim', width: 18 },
				{ header: 'Activated At', key: 'activated_at', width: 16 },
				{ header: 'Deactivated At', key: 'deactivated_at', width: 16 },
				{ header: 'Sub Number', key: 'sub_no', width: 16 },
				{ header: 'Sub Account', key: 'account_sub', width: 16 },
				{ header: 'Master Account', key: 'account_master', width: 18 },
				{ header: 'Provider', key: 'provider', width: 14 },
				{ header: 'User', key: 'user', width: 22 },
				{ header: 'Ramco ID', key: 'ramco_id', width: 12 },
				{ header: 'Cost Center', key: 'costcenter', width: 18 },
				{ header: 'Department', key: 'department', width: 18 },
				{ header: 'Location', key: 'location', width: 16 },
				{ header: 'Asset Register', key: 'asset_register', width: 18 },
				{ header: 'Effective Date', key: 'effective_date', width: 16 },
			];

			// Title row
			const titleRow = sheet.addRow(['Telco SIMs Export']);
			titleRow.font = { bold: true, size: 14 };
			titleRow.alignment = { horizontal: 'center' };
			sheet.mergeCells(titleRow.number, 1, titleRow.number, sheet.columns.length);
			sheet.addRow([]);

			// Header row
			const headerRow = sheet.addRow(sheet.columns.map(col => col.header));
			headerRow.eachCell(cell => {
				cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } }; // blue
				cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
				cell.alignment = { horizontal: 'center', vertical: 'middle' };
				cell.border = {
					top: { style: 'thin' },
					left: { style: 'thin' },
					bottom: { style: 'thin' },
					right: { style: 'thin' },
				};
			});

			sims.forEach((sim, idx) => {
				const latestUserHist = Array.isArray(sim.sim_user_history) && sim.sim_user_history.length > 0
					? sim.sim_user_history[0]
					: undefined;
				const latestAssetHist = Array.isArray(sim.sim_asset_history) && sim.sim_asset_history.length > 0
					? sim.sim_asset_history[0]
					: undefined;
				const derivedUser = sim.user || (typeof latestUserHist?.user === 'object' ? latestUserHist.user : null) || null;
				const derivedDept = sim.department || (latestUserHist as any)?.department || null;
				const derivedCc = sim.costcenter || (latestUserHist as any)?.costcenter || null;
				const derivedLoc = sim.location || (latestUserHist as any)?.location || null;
				const derivedAsset = sim.asset || latestAssetHist?.asset || (latestAssetHist?.register_number ? { register_number: latestAssetHist.register_number } : null) || null;
				const replacementSn = typeof sim.replacement_sim === 'object' ? sim.replacement_sim?.sim_sn : sim.replacement_sim;

				sheet.addRow({
					no: idx + 1,
					sim_sn: sim.sim_sn ?? '',
					status: sim.status ?? '',
					reason: sim.reason ?? '',
					replacement_sim: replacementSn ?? '',
					activated_at: formatDate(sim.activated_at),
					deactivated_at: formatDate(sim.deactivated_at),
					sub_no: sim.subs?.sub_no ?? '',
					account_sub: sim.subs?.account_sub ?? '',
					account_master: sim.account?.account_master ?? '',
					provider: sim.account?.provider ?? '',
					user: derivedUser?.full_name ?? '',
					ramco_id: derivedUser?.ramco_id ?? '',
					costcenter: derivedCc?.name ?? '',
					department: derivedDept?.name ?? '',
					location: derivedLoc?.name ?? '',
					asset_register: derivedAsset?.register_number ?? '',
					effective_date: formatDate(sim.effective_date),
				});
			});

			// Borders for data rows
			const startRow = headerRow.number + 1;
			for (let rowNum = startRow; rowNum <= sheet.lastRow!.number; rowNum++) {
				const row = sheet.getRow(rowNum);
				row.eachCell(cell => {
					cell.border = {
						top: { style: 'thin' },
						left: { style: 'thin' },
						bottom: { style: 'thin' },
						right: { style: 'thin' },
					};
				});
			}

			const buffer = await workbook.xlsx.writeBuffer();
			const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement('a');
			const now = new Date();
			link.href = url;
			link.download = `excel-telco-sims-${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.xlsx`;
			link.click();
			window.URL.revokeObjectURL(url);
			toast.success('Telco SIMs exported');
		} catch (err) {
			console.error('Failed to export telco SIMs', err);
			toast.error('Failed to export telco SIMs');
		} finally {
			setLoading(false);
		}
	};

	return (
		<Button variant="outline" className="gap-2 border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white" onClick={handleExport} disabled={loading}>
			{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
			<span>Export</span>
		</Button>
	);
};

export default ExcelTelcoSims;
