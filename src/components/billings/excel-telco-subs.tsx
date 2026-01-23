'use client';

import React, { useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import ExcelJS from 'exceljs';
import { toast } from 'sonner';

interface Account {
	account_master?: string;
	provider?: string;
}

interface Simcard {
	sim_sn?: string;
}

interface NamedEntity {
	name?: string;
}

interface User {
	full_name?: string;
	ramco_id?: string;
	costcenter?: NamedEntity | null;
	department?: NamedEntity | null;
	location?: NamedEntity | null;
}

interface AssetBrandModel {
	name?: string;
}

interface AssetSpecs {
	brands?: AssetBrandModel | null;
	models?: AssetBrandModel | null;
}

interface Asset {
	register_number?: string;
	brand?: AssetBrandModel | null;
	model?: AssetBrandModel | null;
	specs?: AssetSpecs | null;
}

interface Subscriber {
	id?: number;
	sub_no?: string;
	account_sub?: string;
	status?: string;
	register_date?: string;
	account?: Account | null;
	simcard?: Simcard | null;
	user?: User | null;
	costcenter?: NamedEntity | null;
	department?: NamedEntity | null;
	location?: NamedEntity | null;
	asset?: Asset | null;
}

const pad = (n: number) => n.toString().padStart(2, '0');

const formatDate = (value?: string) => {
	if (!value) return '';
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-GB');
};

const ExcelTelcoSubs: React.FC = () => {
	const [loading, setLoading] = useState(false);

	const handleExport = async () => {
		setLoading(true);
		try {
			const res = await authenticatedApi.get('/api/telco/subs');
			const json = res.data as { status?: string; data?: Subscriber[] };
			const data = Array.isArray(json?.data) ? json.data : [];
			if (!data.length) {
				toast.info('No subscriber data to export');
				return;
			}

			const workbook = new ExcelJS.Workbook();
			const sheet = workbook.addWorksheet('Telco Subscribers');
			sheet.columns = [
				{ header: 'No', key: 'no', width: 6 },
				{ header: 'Sub Number', key: 'sub_no', width: 16 },
				{ header: 'Sub Account', key: 'account_sub', width: 16 },
				{ header: 'Master Account', key: 'account_master', width: 18 },
				{ header: 'Provider', key: 'provider', width: 14 },
				{ header: 'Status', key: 'status', width: 12 },
				{ header: 'Register Date', key: 'register_date', width: 16 },
				{ header: 'SIM SN', key: 'sim_sn', width: 18 },
				{ header: 'User', key: 'user', width: 22 },
				{ header: 'Ramco ID', key: 'ramco_id', width: 12 },
				{ header: 'Cost Center', key: 'costcenter', width: 18 },
				{ header: 'Department', key: 'department', width: 18 },
				{ header: 'Location', key: 'location', width: 16 },
				{ header: 'Asset Register', key: 'asset_register', width: 18 },
				{ header: 'Asset Brand', key: 'asset_brand', width: 16 },
				{ header: 'Asset Model', key: 'asset_model', width: 16 },
			];

			// Title row
			const titleRow = sheet.addRow(['Telco Subscribers Export']);
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

			data.forEach((sub, idx) => {
				sheet.addRow({
					no: idx + 1,
					sub_no: sub.sub_no ?? '',
					account_sub: sub.account_sub ?? '',
					account_master: sub.account?.account_master ?? '',
					provider: sub.account?.provider ?? '',
					status: sub.status ?? '',
					register_date: formatDate(sub.register_date),
					sim_sn: sub.simcard?.sim_sn ?? '',
					user: sub.user?.full_name ?? '',
					ramco_id: sub.user?.ramco_id ?? '',
					costcenter: sub.costcenter?.name ?? sub.user?.costcenter?.name ?? '',
					department: sub.department?.name ?? sub.user?.department?.name ?? '',
					location: sub.location?.name ?? sub.user?.location?.name ?? '',
					asset_register: sub.asset?.register_number ?? '',
					asset_brand: sub.asset?.brand?.name ?? sub.asset?.specs?.brands?.name ?? '',
					asset_model: sub.asset?.model?.name ?? sub.asset?.specs?.models?.name ?? '',
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
			link.download = `excel-telco-subs-${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.xlsx`;
			link.click();
			window.URL.revokeObjectURL(url);
			toast.success('Telco subscribers exported');
		} catch (error) {
			console.error('Failed to export telco subscribers', error);
			toast.error('Failed to export telco subscribers');
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

export default ExcelTelcoSubs;
