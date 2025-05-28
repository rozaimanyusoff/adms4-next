'use client';
import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DataImporterProps {
    onConfirm: (tableName: string, headers: string[], data: any[][]) => void;
}

const DataImporter: React.FC<DataImporterProps> = ({ onConfirm }) => {
    const [rawData, setRawData] = useState<any[][]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [headerRow, setHeaderRow] = useState<number>(0);
    const [dataStartRow, setDataStartRow] = useState<number>(1);
    const [tableName, setTableName] = useState<string>("");
    const [editData, setEditData] = useState<any[][]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handle file upload and parse
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (ext === "csv") {
            Papa.parse(file, {
                complete: (result) => {
                    setRawData(result.data as any[][]);
                    setEditData(result.data as any[][]);
                    setHeaders(result.data[0] as string[]);
                    setHeaderRow(0);
                    setDataStartRow(1);
                },
            });
        } else if (["xls", "xlsx"].includes(ext || "")) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                let data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
                // Handle merged cells
                if (ws['!merges']) {
                    ws['!merges'].forEach((merge) => {
                        const val = data[merge.s.r]?.[merge.s.c];
                        for (let R = merge.s.r; R <= merge.e.r; ++R) {
                            for (let C = merge.s.c; C <= merge.e.c; ++C) {
                                if (R !== merge.s.r || C !== merge.s.c) {
                                    if (!data[R]) data[R] = [];
                                    data[R][C] = val;
                                }
                            }
                        }
                    });
                }
                let headerRowData = data[0] as string[];
                const maxCols = Math.max(...data.map(row => row.length));
                if (headerRowData.length < maxCols) {
                    headerRowData = [
                        ...headerRowData,
                        ...Array.from({ length: maxCols - headerRowData.length }, (_, i) => `Column ${headerRowData.length + i + 1}`)
                    ];
                    data[0] = headerRowData;
                }
                setRawData(data);
                setEditData(data);
                setHeaders(headerRowData);
                setHeaderRow(0);
                setDataStartRow(1);
            };
            reader.readAsBinaryString(file);
        }
    };

    // Allow user to select header row and data start row
    const handleHeaderRowChange = (rowIdx: number) => {
        setHeaderRow(rowIdx);
        setHeaders(editData[rowIdx] as string[]);
        setDataStartRow(rowIdx + 1);
    };

    // Allow editing of cell values
    const handleCellEdit = (rowIdx: number, colIdx: number, value: string) => {
        setEditData((prev) => {
            const copy = prev.map((row) => [...row]);
            copy[rowIdx][colIdx] = value;
            return copy;
        });
        if (rowIdx === headerRow) {
            setHeaders((prev) => {
                const copy = [...prev];
                copy[colIdx] = value;
                return copy;
            });
        }
    };

    // Remove row
    const handleRemoveRow = (rowIdx: number) => {
        setEditData((prev) => prev.filter((_, idx) => idx !== rowIdx));
    };

    // Remove column
    const handleRemoveCol = (colIdx: number) => {
        setEditData((prev) => prev.map((row) => row.filter((_, idx) => idx !== colIdx)));
        setHeaders((prev) => prev.filter((_, idx) => idx !== colIdx));
    };

    // Confirm and send to backend
    const handleConfirm = () => {
        const dataRows = editData.slice(dataStartRow);
        onConfirm(tableName, headers, dataRows);
    };

    return (
        <div className="space-y-6">
            <div>
                <Input
                    type="file"
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                />
                <div className="mt-2 text-sm text-yellow-700 bg-yellow-100 border-l-4 border-yellow-400 p-2 rounded">
                    <strong>Warning:</strong> Please remove any merged columns and filter rows in your Excel/CSV file before importing. Merged columns and filters can cause data to be misaligned or missing in the preview and import.
                </div>
            </div>
            {editData.length > 0 && (
                <>
                    <div className="flex gap-2 items-center mb-2">
                        <label className="font-semibold">Table Name:</label>
                        <Input value={tableName} onChange={e => setTableName(e.target.value)} placeholder="Enter table name" className="w-64" />
                    </div>
                    <div className="flex gap-4 mb-2">
                        <div>
                            <label className="font-semibold">Header Row:</label>
                            <select value={headerRow} onChange={e => handleHeaderRowChange(Number(e.target.value))} className="ml-2 border rounded px-2 py-1">
                                {editData.map((row, idx) => (
                                    <option key={idx} value={idx}>Row {idx + 1}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="font-semibold">Data Starts At Row:</label>
                            <select value={dataStartRow} onChange={e => setDataStartRow(Number(e.target.value))} className="ml-2 border rounded px-2 py-1">
                                {editData.map((row, idx) => idx > headerRow && (
                                    <option key={idx} value={idx}>Row {idx + 1}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="overflow-x-auto border rounded bg-white dark:bg-gray-900">
                        <table className="min-w-full text-xs">
                            <thead>
                                <tr>
                                    <th className="border px-2 py-1 bg-gray-100 dark:bg-gray-800 w-10 text-center">#</th>
                                    {headers.map((header, colIdx) => (
                                        <th key={colIdx} className="border px-2 py-1 bg-gray-100 dark:bg-gray-800">
                                            <input
                                                className="w-full font-bold bg-transparent border-none outline-none"
                                                value={header}
                                                onChange={e => handleCellEdit(headerRow, colIdx, e.target.value)}
                                                placeholder={`Column ${colIdx + 1}`}
                                            />
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <button className="ml-1 text-red-500" onClick={() => handleRemoveCol(colIdx)}>
                                                            <X size={16} />
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="bottom">Remove column</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {editData.map((row, rowIdx) => (
                                    rowIdx !== headerRow && rowIdx >= dataStartRow && (
                                        <tr key={rowIdx}>
                                            <td className="border px-2 py-1 text-center font-mono bg-gray-50 dark:bg-gray-900">{rowIdx + 1}</td>
                                            {headers.map((_, colIdx) => (
                                                <td key={colIdx} className="border px-2 py-1">
                                                    <input
                                                        className="w-full bg-transparent border-none outline-none"
                                                        value={row[colIdx] !== undefined ? row[colIdx] : ""}
                                                        onChange={e => handleCellEdit(rowIdx, colIdx, e.target.value)}
                                                    />
                                                </td>
                                            ))}
                                            <td>
                                                <button className="text-red-500" onClick={() => handleRemoveRow(rowIdx)} title="Remove row">×</button>
                                            </td>
                                        </tr>
                                    )
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-end mt-4">
                        <Button onClick={handleConfirm} disabled={!tableName || headers.length === 0 || editData.length === 0}>
                            Confirm & Import
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
};

export default DataImporter;
