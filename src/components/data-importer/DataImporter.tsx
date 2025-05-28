'use client';
import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { processCsvFile, processExcelFile } from "@/lib/dataImportUtils";
import { authenticatedApi } from "@/config/api";
import { toast } from "sonner";

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
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [existingTables, setExistingTables] = useState<any[]>([]);
    const [showExistingTables, setShowExistingTables] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch existing tables on mount
    useEffect(() => {
        const fetchTables = async () => {
            try {
                const res = await authenticatedApi.get("/api/importer/tables");
                setExistingTables(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                setExistingTables([]);
            }
        };
        fetchTables();
    }, []);

    // Handle file upload and parse
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoading(true);
        setProgress(10);
        const ext = file.name.split(".").pop()?.toLowerCase();
        let data: any[][] = [];
        if (ext === "csv") {
            data = await processCsvFile(file, setProgress);
        } else if (["xls", "xlsx"].includes(ext || "")) {
            data = await processExcelFile(file, setProgress);
        }
        if (data.length > 0) {
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
            setProgress(100);
            setTimeout(() => setLoading(false), 400);
        } else {
            setLoading(false);
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
    const handleConfirm = async () => {
        // Format headers: lowercase, replace spaces with underscores, remove parenthesis and their content
        const formattedHeaders = headers.map(h =>
            String(h || "")
                .toLowerCase()
                .replace(/\s+/g, '_')
                .replace(/\([^)]*\)/g, '') // remove parenthesis and content
                .replace(/_+/g, '_') // collapse multiple underscores
                .replace(/^_+|_+$/g, '') // trim underscores
        );
        // Pad each data row to match headers length, and use null for empty cells
        const dataRows = editData.slice(dataStartRow).map(row => {
            const padded = row.length < formattedHeaders.length
                ? [...row, ...Array(formattedHeaders.length - row.length).fill("")]
                : row.slice(0, formattedHeaders.length);
            return padded.map(cell => (cell === undefined || cell === null || cell === "") ? null : cell);
        });
        const payload = {
            tableName,
            headers: formattedHeaders,
            data: dataRows
        };
        try {
            await authenticatedApi.post("/api/importer/import-temp-table", payload);
            toast.success("Import successful!");
            // Refetch tables after successful import
            try {
                const res = await authenticatedApi.get("/api/importer/tables");
                setExistingTables(Array.isArray(res.data) ? res.data : []);
                setShowExistingTables(true);
            } catch (err) {
                // Optionally handle error
            }
            onConfirm(tableName, formattedHeaders, dataRows);
        } catch (error) {
            toast.error("Import failed. Please try again.");
            console.error("Import failed", error);
        }
    };

    return (
        <div className="space-y-6">
            {loading && (
                <div className="mb-2">
                    <Progress value={progress} className="h-2" />
                </div>
            )}
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
                {showExistingTables && existingTables.length > 0 && (
                    <div className="mb-4 border rounded bg-white dark:bg-gray-900 p-4">
                        <div className="font-semibold mb-2">Previously Uploaded Tables</div>
                        <table className="min-w-full text-xs border">
                            <thead>
                                <tr>
                                    <th className="border px-2 py-1">No</th>
                                    <th className="border px-2 py-1">Table Name</th>
                                    <th className="border px-2 py-1">Columns</th>
                                </tr>
                            </thead>
                            <tbody>
                                {existingTables.map((tbl, idx) => (
                                    <tr key={tbl.tableName || idx}>
                                        <td className="border px-2 py-1 text-center">{idx + 1}</td>
                                        <td className="border px-2 py-1">{tbl.tableName}</td>
                                        <td className="border px-2 py-1">{Array.isArray(tbl.columns) ? tbl.columns.join(", ") : tbl.columns}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {editData.length > 0 && (
                <>
                    <div className="flex flex-wrap gap-2 items-center mb-2">
                        <Label className="font-semibold">Table Name:</Label>
                        <Input value={tableName} onChange={e => setTableName(e.target.value)} placeholder="Enter table name" className="w-64" />
                        <Label className="font-semibold ml-4">Header Row:</Label>
                        <Input
                            type="number"
                            min={1}
                            max={editData.length}
                            value={headerRow + 1}
                            onChange={e => {
                                const val = Math.max(1, Math.min(editData.length, Number(e.target.value)));
                                handleHeaderRowChange(val - 1);
                            }}
                            className="w-20"
                        />
                        <Label className="font-semibold ml-4">Data Starts At Row:</Label>
                        <Input
                            type="number"
                            min={headerRow + 2}
                            max={editData.length}
                            value={dataStartRow + 1}
                            onChange={e => {
                                const val = Math.max(headerRow + 2, Math.min(editData.length, Number(e.target.value)));
                                setDataStartRow(val - 1);
                            }}
                            className="w-20"
                        />
                        <Button onClick={handleConfirm} disabled={!tableName || headers.length === 0 || editData.length === 0} className="ml-4">
                            Confirm & Import
                        </Button>
                    </div>
                    <div className="overflow-x-auto min-w-[600px] border rounded bg-white dark:bg-gray-900 lg:overflow-x-visible">
                        <table className="min-w-full text-xs">
                            <thead>
                                <tr>
                                    <th className="border px-2 py-1 bg-gray-100 dark:bg-gray-800 w-10 text-center">Row</th>
                                    {headers.map((header, colIdx) => {
                                        // Format header: lowercase, replace spaces with underscores
                                        const formattedHeader = String(header || "")
                                            .toLowerCase()
                                            .replace(/\s+/g, '_');
                                        return (
                                            <th key={colIdx} className="border px-2 py-1 bg-gray-100 dark:bg-gray-800">
                                                <Input
                                                    className="w-full font-bold bg-transparent border-none outline-none"
                                                    value={header}
                                                    onChange={e => handleCellEdit(headerRow, colIdx, e.target.value)}
                                                    placeholder={`Column ${colIdx + 1}`}
                                                />
                                                <div className="text-[10px] text-gray-500 mt-1 select-none">
                                                    {formattedHeader}
                                                </div>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="ml-1 text-red-500 p-0 h-auto w-auto min-w-0 min-h-0" onClick={() => handleRemoveCol(colIdx)}>
                                                                <X size={16} />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="bottom">Remove column</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {editData.map((row, rowIdx) => (
                                    rowIdx !== headerRow && rowIdx >= dataStartRow && (
                                        <tr key={rowIdx}>
                                            <td className="border px-2 py-1 text-center font-mono bg-gray-50 dark:bg-gray-900">{rowIdx + 1}</td>
                                            {headers.map((_, colIdx) => (
                                                <td key={colIdx} className="border px-2 py-1">
                                                    {row[colIdx] instanceof Date
                                                        ? row[colIdx].toLocaleString()
                                                        : (row[colIdx] !== undefined ? String(row[colIdx]) : "")}
                                                </td>
                                            ))}
                                            <td>
                                                <Button variant="ghost" size="icon" className="text-red-500 p-0 h-auto w-auto min-w-0 min-h-0" onClick={() => handleRemoveRow(rowIdx)} title="Remove row">
                                                    ×
                                                </Button>
                                            </td>
                                        </tr>
                                    )
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Load More button remains disabled */}
                </>
            )}
        </div>
    );
}

export default DataImporter;
