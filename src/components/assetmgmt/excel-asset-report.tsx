"use client";

import React, { useState } from "react";
import type * as ExcelJSType from "exceljs";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { authenticatedApi } from "@/config/api";

interface TypeEntry { id: number; name?: string; }
interface Named { id?: number; name?: string; }
interface Owner { full_name?: string; ramco_id?: string; }
interface Specs { [key: string]: any; }
interface Asset {
    classification?: string;
    record_status?: string;
    register_number?: string;
    purchase_date?: string;
    purchase_year?: number;
    costcenter?: Named;
    department?: Named;
    location?: Named;
    type?: Named;
    types?: Named;
    category?: Named;
    categories?: Named;
    brand?: Named;
    brands?: Named;
    model?: Named;
    owner?: Owner;
    specs?: Specs | Specs[];
    age?: number;
    entry_code?: string;
    condition_status?: string;
    nbv?: string;
    unit_price?: string;
    purpose?: string;
    disposed_date?: string | null;
    purchase_id?: number | null;
}

interface ExcelAssetReportProps {
    types: TypeEntry[];
    managerId?: number;
}

const ExcelAssetReport: React.FC<ExcelAssetReportProps> = ({ types, managerId }) => {
    const [exporting, setExporting] = useState(false);

    const formatTimestamp = () => {
        const d = new Date();
        const pad = (n: number) => n.toString().padStart(2, "0");
        const dd = pad(d.getDate());
        const mm = pad(d.getMonth() + 1);
        const yyyy = d.getFullYear().toString();
        const hh = pad(d.getHours());
        const min = pad(d.getMinutes());
        const ss = pad(d.getSeconds());
        return `${dd}${mm}${yyyy}${hh}${min}${ss}`;
    };

    const formatHeaderLabel = (key: string) => key
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());

    const normalizeValue = (val: any) => {
        if (val === null || val === undefined) return "";
        if (typeof val === "string") {
            const parsed = new Date(val);
            if (!Number.isNaN(parsed.getTime()) && /\d{4}-\d{2}-\d{2}/.test(val.substring(0, 10))) {
                return parsed.toLocaleDateString();
            }
            return val;
        }
        if (typeof val === "number" || typeof val === "boolean") return val;
        return Array.isArray(val) ? val.join(", ") : JSON.stringify(val);
    };

    const getSpecs = (asset: Asset) => {
        if (!asset?.specs) return {};
        if (Array.isArray(asset.specs)) {
            const specsArr = asset.specs as any[];
            const mainSpec =
                specsArr.find(s => s && typeof s === 'object' && s.type_id) ||
                specsArr.find(s => s && typeof s === 'object' && !('field' in s)) ||
                specsArr[0] ||
                {};

            const fieldFragments = specsArr
                .filter(s => s && typeof s === 'object' && 'field' in s && 'value' in s)
                .reduce((acc: Record<string, any>, entry: any) => {
                    acc[entry.field] = entry.value;
                    return acc;
                }, {});

            return { ...mainSpec, ...fieldFragments };
        }
        return asset.specs;
    };

    const mapAssetForExport = (asset: Asset): Record<string, any> => {
        const currentYear = new Date().getFullYear();
        const specs = getSpecs(asset);
        const formatDate = (val?: string | null) => val ? new Date(val).toLocaleDateString() : "";

        const row: Record<string, any> = {
            Classification: asset.classification || "",
            "Condition Status": asset.condition_status || "",
            "Record Status": asset.record_status || "",
            "Register Number": asset.register_number || "",
            "Entry Code": asset.entry_code || "",
            "Asset Type": asset.types?.name || asset.type?.name || "",
            Category: asset.categories?.name || asset.category?.name || "",
            Brand: asset.brands?.name || asset.brand?.name || "",
            Model: asset.model?.name || "",
            Age: asset.purchase_year ? currentYear - asset.purchase_year : "",
            "Purchase Date": formatDate(asset.purchase_date),
            "Purchase Year": asset.purchase_year || "",
            Purpose: asset.purpose || "",
            "Cost Center": asset.costcenter?.name || "",
            Department: asset.department?.name || "",
            Location: asset.location?.name || "",
            "Owner Name": asset.owner?.full_name || "",
            "Owner Ramco": asset.owner?.ramco_id || "",
            NBV: asset.nbv || "",
            "Unit Price": asset.unit_price || "",
            "Disposed Date": formatDate(asset.disposed_date),
        };

        Object.entries(specs || {}).forEach(([key, val]) => {
            if (!key) return;
            if (key.toLowerCase().includes("id")) return;
            row[formatHeaderLabel(key)] = normalizeValue(val);
        });

        return row;
    };

    const getManagerIdsForExport = async () => {
        const collected = new Set<number>();
        try {
            const managersRes = await authenticatedApi.get<any>("/api/assets/managers");
            const managers = Array.isArray(managersRes.data) ? managersRes.data : (managersRes.data?.data || []);
            managers
                .map((entry: any) => Number(entry.manager_id || entry.id))
                .filter((id: number) => !Number.isNaN(id))
                .forEach((id: number) => collected.add(id));
        } catch (err) {
            // ignore and fall back to type ids
        }
        types
            .map(t => Number((t as any).id))
            .filter((id: number) => !Number.isNaN(id))
            .forEach((id: number) => collected.add(id));
        if (managerId) collected.add(managerId);
        return Array.from(collected);
    };

    const handleExportByManager = async () => {
        setExporting(true);
        try {
            const managerIds = await getManagerIdsForExport();
            if (!managerIds.length) {
                alert("No managers found to export.");
                return;
            }

            const ExcelJS = (await import("exceljs")) as typeof import("exceljs");
            const workbook = new ExcelJS.Workbook();
            const managerDataCache = new Map<number, Asset[]>();

            const fetchAssetsForManager = async (mId: number) => {
                if (managerDataCache.has(mId)) return managerDataCache.get(mId) || [];
                const res = await authenticatedApi.get<any>(`/api/assets?manager=${mId}`);
                const assetsPayload = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                managerDataCache.set(mId, assetsPayload);
                return assetsPayload;
            };

            const allAssetsRes = await authenticatedApi.get<any>("/api/assets");
            const allAssetsPayload = Array.isArray(allAssetsRes.data)
                ? allAssetsRes.data
                : (allAssetsRes.data?.data || []);

            const activeAssets: Asset[] = allAssetsPayload.filter((a: Asset) => {
                const isAsset = String(a.classification || "").toLowerCase() === "asset";
                const isActive = String(a.record_status || "").toLowerCase() === "active";
                return isAsset && isActive;
            });

            if (activeAssets.length) {
                const summarySheet = workbook.addWorksheet("Asset Summary");
                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

                const typeGroups: Record<string, Asset[]> = {};
                const getTypeName = (asset: Asset) =>
                    String(asset.types?.name || asset.type?.name || "Unknown Type");

                activeAssets.forEach(asset => {
                    const tName = getTypeName(asset);
                    if (!typeGroups[tName]) typeGroups[tName] = [];
                    typeGroups[tName].push(asset);
                });

                Object.entries(typeGroups).forEach(([typeName, typeAssets], typeIdx) => {
                    summarySheet.addRow([`Asset Type: ${typeName}`]).font = { bold: true, size: 12 };

                    const categoryGroups: Record<string, Asset[]> = {};
                    typeAssets.forEach(asset => {
                        const catName = asset.categories?.name || asset.category?.name || "Uncategorized";
                        if (!categoryGroups[catName]) categoryGroups[catName] = [];
                        categoryGroups[catName].push(asset);
                    });

                    Object.entries(categoryGroups).forEach(([catName, assets]) => {
                        const yearMonthMap: Record<number, number[]> = {};
                        assets.forEach(asset => {
                            const dateVal = asset.purchase_date;
                            if (!dateVal) return;
                            const parsed = new Date(dateVal);
                            if (Number.isNaN(parsed.getTime())) return;
                            const year = parsed.getFullYear();
                            const month = parsed.getMonth();
                            if (!yearMonthMap[year]) yearMonthMap[year] = new Array(12).fill(0);
                            yearMonthMap[year][month] += 1;
                        });

                        const years = Object.keys(yearMonthMap)
                            .map(y => Number(y))
                            .filter(y => !Number.isNaN(y))
                            .sort((a, b) => b - a);

                        summarySheet.addRow([`Category: ${catName}`]).font = { bold: true, size: 12 };
                        const headerRow = summarySheet.addRow(["Year", ...months, "Total"]);
                        headerRow.eachCell(cell => {
                            cell.font = { bold: true };
                            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E1F2" } };
                            cell.border = {
                                top: { style: "thin" },
                                left: { style: "thin" },
                                bottom: { style: "thin" },
                                right: { style: "thin" },
                            };
                        });

                        years.forEach(year => {
                            const monthCounts = yearMonthMap[year] || new Array(12).fill(0);
                            const total = monthCounts.reduce((sum, c) => sum + c, 0);
                            const dataRow = summarySheet.addRow([year, ...monthCounts, total]);
                            dataRow.eachCell(cell => {
                                cell.border = {
                                    top: { style: "thin" },
                                    left: { style: "thin" },
                                    bottom: { style: "thin" },
                                    right: { style: "thin" },
                                };
                            });
                        });

                        summarySheet.addRow([]);
                    });

                    if (typeIdx < Object.keys(typeGroups).length - 1) {
                        summarySheet.addRow([]);
                    }
                });

                summarySheet.columns?.forEach(col => {
                    col.width = 12;
                });
            }

            for (const mId of managerIds) {
                const assetsPayload = await fetchAssetsForManager(mId);
                const rows: Record<string, any>[] = assetsPayload.map(mapAssetForExport);
                const headers: string[] = Array.from(rows.reduce((set: Set<string>, row: Record<string, any>) => {
                    Object.keys(row).forEach(key => set.add(key));
                    return set;
                }, new Set<string>()));

                const matchedType = types.find(t => Number((t as any).id) === Number(mId));
                const rawSheetName = matchedType?.name || `Manager ${mId}`;
                const sheetName = rawSheetName.length > 31 ? rawSheetName.slice(0, 31) : rawSheetName;
                const worksheet = workbook.addWorksheet(sheetName || `Manager ${mId}`);

                if (!rows.length) {
                    worksheet.addRow(["No data available"]);
                    continue;
                }

                const headerRow = worksheet.addRow(headers);
                headerRow.eachCell(cell => {
                    cell.font = { bold: true };
                    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFCCE5FF" } };
                    cell.border = {
                        top: { style: "thin" },
                        left: { style: "thin" },
                        bottom: { style: "thin" },
                        right: { style: "thin" },
                    };
                });

                rows.forEach((row: Record<string, any>) => {
                    const dataRow = worksheet.addRow(headers.map((h: string) => row[h] ?? ""));
                    dataRow.eachCell(cell => {
                        cell.border = {
                            top: { style: "thin" },
                            left: { style: "thin" },
                            bottom: { style: "thin" },
                            right: { style: "thin" },
                        };
                        cell.alignment = { vertical: "top", wrapText: true };
                    });
                });

                worksheet.columns?.forEach((col, idx) => {
                    const headerLength = headers[idx]?.length || 10;
                    const values = (col?.values as ExcelJSType.CellValue[] | undefined) ?? [];
                    const colLength = Math.max(
                        headerLength,
                        ...values
                            .filter(v => v !== undefined && v !== null)
                            .map(v => String(v).length)
                    );
                    col.width = Math.min(Math.max(colLength + 2, 12), 50);
                });
            }

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const link = document.createElement("a");
            const timestamp = formatTimestamp();
            link.href = URL.createObjectURL(blob);
            link.setAttribute("download", `assets_by_manager_${timestamp}.xlsx`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Failed to export assets by manager", error);
            alert("Unable to export assets by manager. Please try again.");
        } finally {
            setExporting(false);
        }
    };

    return (
        <Button
            size="sm"
            variant="default"
            onClick={handleExportByManager}
            disabled={exporting}
            className="flex items-center gap-2"
        >
            {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <FileSpreadsheet className="h-4 w-4" />
            )}
            Excel Export
        </Button>
    );
};

export default ExcelAssetReport;
