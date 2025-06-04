/* Grid Container */
const gridContainer = "relative rounded-none w-full transition-all duration-300 ease-in-out min-w-0 lg:min-w-[768px]";
const gridHeader = "overflow-x-auto border border-b-0 dark:border-dark rounded-none";

/* Input Filter */
const inputFilterWrapper = "grow";
const inputFilterInput = "form-input border-0 border-b form-input-sm bg-transparent/10 placeholder:text-sm dark:placeholder:text-dark-light p-2 border rounded-none w-full";

/* Column Visibility Toggle */
const columnToggleButton = "form-select bg-transparent/10 placeholder:text-base placeholder:text-gray-600 dark:placeholder:text-dark-light p-2 border rounded-xs text-left truncate min-w-[150px]";
const columnToggleItem = "block text-base cursor-pointer px-1 py-0.5 hover:bg-gray-100 dark:hover:bg-amber-600";

/* Export Dropdown */
const exportButton = "form-select bg-transparent/10 placeholder:text-base p-2 border rounded-xs text-left truncate min-w-[120px]";
const exportMenuItem = "block w-full text-left text-sm px-2 py-1 hover:bg-gray-300 dark:hover:bg-amber-600";

/* Table Structure */
const tableWrapper = "w-full border-collapse min-w-full whitespace-nowrap";
const theadWrapper = "bg-transparent dark:bg-slate-900! dark:text-dark-light sticky top-0 z-10";
const theadTh = "relative text-left px-4 py-2 border-b-0 dark:border-dark cursor-pointer select-none";
const columnResizer = "column-resizer absolute right-0 top-0 h-3/4 w-[4px] my-1 rounded-t-full rounded-b-full cursor-col-resize bg-gray-200 hover:bg-gray-500 transition";

/* Column Filters */
const theadFilterRow = "bg-gray-300 dark:bg-slate-800 text-sm border-b border-gray-200 dark:border-slate-700";
const filterCellInput = "w-full bg-gray-100 max-w-full px-1 py-0.5 border text-xs rounded-xs dark:placeholder:text-dark-light";
const filterCellSelect = "w-full bg-gray-100 max-w-full px-1 py-0.5 border capitalize text-xs rounded-xs truncate dark:text-dark-light";

/* Row Styling */
const rowSelected = "bg-amber-300! dark:bg-amber-700!";
const rowDoubleClicked = "bg-amber-200! dark:bg-amber-800!";
const rowExpanded = "bg-amber-200! dark:bg-amber-600!"; // Expanded row background
const rowHover = "hover:bg-amber-100 dark:hover:bg-amber-600 dark:hover:text-white";
const expandedCellBorder = "border-amber-200 dark:border-amber-600";
const defaultCellBorder = "dark:border-dark";

/* Checkbox */
const checkboxCell = "dark:border-dark text-center even:bg-gray-50 dark:bg-slate-700 border-t";

/* Expand Button Cells */
const expandCellCollapsed = "border-b border-r dark:border-r-0 border-gray-200 dark:border-slate-700"; // '+' Cell background during collapsed
const expandCellExpanded = "bg-amber-200 dark:bg-amber-600 border-x border-b border-amber-200 dark:border-amber-600 dark:border-r-amber-600"; // '-' Cell background during expanded

/* Hovered Cell Highlight */
const hoveredCell = "bg-amber-100 text-red-500 font-extrabold";
const hoveredRowOrCol = "bg-amber-100 font-extrabold";

/* Expanded Row */
const expandedRowLeft = "bg-amber-200 dark:bg-amber-600 border-x border-b border-amber-200 dark:border-amber-600";
const expandedRowLeftSpacer = "border-l border-b border-amber-200 dark:border-l-amber-600 dark:border-b-amber-600 bg-amber-200 dark:bg-amber-600";
const expandedRowContent = "bg-amber-200 dark:bg-amber-600 border-x border-b border-amber-200 dark:border-amber-600 dark:text-dark-light px-4 py-2";

/* Pagination */
const paginationContainer = "bg-gray-100 border border-t-0 dark:bg-slate-800 dark:border-dark p-2 space-y-3";
const paginationButton = "px-2 py-1 text-xs border border-gray-300 rounded-sm disabled:opacity-50";
const paginationButtonActive = "bg-blue-600 text-white border-none dark:text-danger-light font-semibold";

/*
customdatagrid_features_guide.txt
*/
import React, { useMemo, useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { createPortal } from 'react-dom';
import type { FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faMinus, faFileExcel, faFileCsv, faFilePdf, faGear } from '@fortawesome/free-solid-svg-icons';

// Types
export interface ColumnDef<T> {
    key: keyof T;
    header: string;
    sortable?: boolean;
    filterable?: boolean;
    filter?: 'input' | 'singleSelect' | 'multiSelect' | 'date' | 'dateRange';
    filterParams?: {
        options?: Array<string | number>;
        labelMap?: Record<string | number, string>;
    };
    /** Static class name for cells in this column */
    colClass?: string;
    /** Function to compute class name for a cell based on row data */
    colClassParams?: (row: T) => string;
    /** Custom render function for a cell */
    render?: (row: T) => React.ReactNode;
    /** Initial visibility of the column */
    columnVisible?: boolean;
}

export interface DataGridProps<T> {
    data: T[];
    columns: ColumnDef<T>[];
    pageSize?: number;
    pagination?: boolean;
    inputFilter?: boolean;
    rowExpandable?: {
        enabled: boolean;
        render: (row: T) => React.ReactNode;
    };
    rowSelection?: {
        enabled: boolean;
        getRowId?: (row: T) => string | number;
        onSelect?: (selectedKeys: (string | number)[], selectedData: T[]) => void;
        isSelectable?: (row: T) => boolean;
    };
    /** Function to compute class name for a row based on row data */
    rowClass?: (row: T) => string;
    /** Option to allow toggling column visibility */
    columnsVisibleOption?: boolean;
    /** Option to enable export dropdown */
    dataExport?: boolean;
    /** Option to enable row and column highlight on hover */
    rowColHighlight?: boolean;
    /** Option to show panel tool for grid settings */
    panelTool?: boolean; // (removed usage)
    theme?: 'xs' | 'sm' | 'md' | 'lg' | {
        layouts?: {
            gridSize?: 'xs' | 'sm' | 'md' | 'lg';
        };
    };
    /** Optional row double-click handler */
    onRowDoubleClick?: (row: T) => void;
    /** Optional callback when row selection changes (excluding filtered-out rows) */
    onRowSelected?: (selectedKeys: (string | number)[], selectedData: T[]) => void;
    /** Optional external control of selected row keys */
    selectedRowKeys?: Set<string | number>;
    /** Optional setter for external selected row keys */
    setSelectedRowKeys?: React.Dispatch<React.SetStateAction<Set<string | number>>>;
}

// Utility Functions
const sortData = <T,>(data: T[], key: keyof T, direction: 'asc' | 'desc') => {
    return [...data].sort((a, b) => {
        if (a[key] == null) return 1;
        if (b[key] == null) return -1;
        if (a[key]! < b[key]!) return direction === 'asc' ? -1 : 1;
        if (a[key]! > b[key]!) return direction === 'asc' ? 1 : -1;
        return 0;
    });
};


// Main Grid Component
const CustomDataGridInner = <T,>({
    data,
    columns,
    pageSize: initialPageSize = 10,
    pagination = true,
    inputFilter = true,
    rowExpandable,
    rowSelection,
    rowClass,
    columnsVisibleOption,
    dataExport,
    rowColHighlight = false,
    // panelTool removed from usage
    theme,
    onRowDoubleClick,
    onRowSelected,
}: DataGridProps<T>, ref: React.Ref<any>) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [sortKey, setSortKey] = useState<keyof T | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [filterText, setFilterText] = useState('');
    const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string | number>>(new Set());
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    // All columns, including grouped/dynamic, are visible by default.
    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(columns.map(col => [String(col.key), col.columnVisible !== false]))
    );
    const [pageSize, setPageSize] = useState(initialPageSize);
    // Resizable columns state
    // -- Filter type state for column filter menu
    const [filterTypes, setFilterTypes] = useState<Record<string, 'input' | 'dropdown' | 'none'>>({});

    // Handler for filter type change from column menu
    const handleFilterTypeChange = (key: keyof T, type: 'input' | 'dropdown' | 'none') => {
        setFilterTypes(prev => ({ ...prev, [key]: type }));
    };
    // State for double-clicked highlighted row
    const [highlightedRowKey, setHighlightedRowKey] = useState<string | number | null>(null);
    // Grid size (panel tool removed)
    const [gridSize, setGridSize] = useState<'xs' | 'sm' | 'md' | 'lg'>(() => {
        if (typeof theme === 'string') return theme;
        return theme?.layouts?.gridSize ?? 'md';
    });
    // Ref to store row click timestamps for double-click emulation
    const rowClickTimestamps = useRef<Record<string | number, number>>({});

    useImperativeHandle(ref, () => ({
        deselectRow: (key: string | number) => {
            setSelectedRowKeys(prev => {
                const updated = new Set(prev);
                updated.delete(key);
                return updated;
            });
        },
        clearSelectedRows: () => {
            setSelectedRowKeys(new Set());
        }
    }));

    // Consistent row/col size class
    // Flat columns (for visibleColumns, rendering, etc.)
    const flatColumns = useMemo(() => columns, [columns]);

    const sizeClass = useMemo(() => {
        switch (gridSize) {
            case 'xs': return 'text-xs px-1 py-1';
            case 'sm': return 'text-sm px-2 py-1.5';
            case 'md': return 'px-3 py-2';
            case 'lg': return 'text-lg px-3 py-2';
            default: return 'px-3 py-2';
        }
    }, [gridSize]);
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
    // Resizing logic
    const handleColumnResize = (key: string, deltaX: number) => {
        setColumnWidths(prev => ({
            ...prev,
            [key]: Math.max((prev[key] || 150) + deltaX, 50),
        }));
    };
    const [columnFilters, setColumnFilters] = useState<Record<string, any>>({});
    // Dropdown open state for multiSelect filters
    const [openMultiSelect, setOpenMultiSelect] = useState<Record<string, boolean>>({});
    // Track filter text for each multiSelect
    const [multiSelectSearch, setMultiSelectSearch] = useState<Record<string, string>>({});

    const filteredData = useMemo(() => {
        let result = [...data];

        // Global text filter
        if (filterText) {
            const search = filterText.toLowerCase();
            result = result.filter(row =>
                columns.some(col => {
                    const value = row[col.key];
                    if (typeof value === 'string' || typeof value === 'number') {
                        return String(value).toLowerCase().includes(search);
                    }
                    return false;
                })
            );
        }

        // Per-column filters
        Object.entries(columnFilters).forEach(([key, value]) => {
            if (!value) return;
            result = result.filter(row => {
                // Find the column definition for key
                const col = columns.find(c => String(c.key) === key);
                const rawValue = row[key as keyof T];
                const rowValue = typeof rawValue === 'object' && rawValue !== null
                    ? JSON.stringify(rawValue).toLowerCase()
                    : String(rawValue ?? '').toLowerCase();
                if (Array.isArray(value)) {
                    return value.some(v => {
                        const filterVal = String(v).toLowerCase();
                        if (typeof rawValue === 'object' && rawValue !== null) {
                            return Object.values(rawValue).some(rv =>
                                String(rv).toLowerCase() === filterVal
                            );
                        }
                        return rowValue === filterVal;
                    });
                }
                return rowValue.includes(String(value).toLowerCase());
            });
        });

        return result;
    }, [filterText, data, columns, columnFilters]);

    const sortedData = useMemo(() => {
        if (!sortKey) return filteredData;
        return sortData(filteredData, sortKey, sortDirection);
    }, [filteredData, sortKey, sortDirection]);

    const pagedData = useMemo(() => {
        if (!pagination) return sortedData;
        const start = (currentPage - 1) * pageSize;
        return sortedData.slice(start, start + pageSize);
    }, [sortedData, currentPage, pageSize, pagination]);

    const handleSort = (key: keyof T) => {
        if (sortKey === key) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDirection('asc');
        }
    };

    const totalPages = Math.ceil(sortedData.length / pageSize);

    const startEntry = (currentPage - 1) * pageSize + 1;
    const endEntry = Math.min(currentPage * pageSize, sortedData.length);

    const resolveRowKey = (row: T, index: number) =>
        rowSelection?.getRowId?.(row) ?? index + (currentPage - 1) * pageSize;

    useEffect(() => {
        if (rowSelection?.onSelect) {
            const keys = Array.from(selectedRowKeys);
            const dataSelected = sortedData.filter((row, i) => {
                const key = resolveRowKey(row, i);
                return keys.includes(key) && (!rowSelection.isSelectable || rowSelection.isSelectable(row));
            });
            const filteredKeys = dataSelected.map((row, i) => resolveRowKey(row, i));
            rowSelection.onSelect(filteredKeys, dataSelected);
            alert("Triggered from DataGrid - Selected Keys: " + filteredKeys.join(", "));
        }
        if (onRowSelected) {
            const keys = Array.from(selectedRowKeys);
            const dataSelected = sortedData.filter((row, i) => {
                const key = resolveRowKey(row, i);
                return keys.includes(key) && (!rowSelection?.isSelectable || rowSelection.isSelectable(row));
            });
            const filteredKeys = dataSelected.map((row, i) => resolveRowKey(row, i));
            onRowSelected(filteredKeys, dataSelected);
        }
    }, [selectedRowKeys]);

    // Auto-resize columns if columnWidths not set for a given column key
    useEffect(() => {
        // Determine offset for nth-child, accounting for rowSelection and rowExpandable columns
        let offset = 0;
        if (rowSelection?.enabled) offset += 1;
        if (rowExpandable?.enabled) offset += 1;

        // Only auto-resize if some columnWidths are missing
        const missingWidths = flatColumns.some(col => columnWidths[String(col.key)] === undefined);
        if (!missingWidths) return;

        const table = document.querySelector('table');
        if (!table) return;

        const newWidths: Record<string, number> = {};
        flatColumns.forEach((col, index) => {
            const cells = table.querySelectorAll(`tbody tr td:nth-child(${index + 1 + offset})`);
            const widths = Array.from(cells).map(cell => cell.scrollWidth);
            const max = Math.max(...widths, col.header.length * 8); // fallback for header
            newWidths[String(col.key)] = max + 20;
        });
        setColumnWidths(prev => ({ ...newWidths, ...prev }));
    }, [flatColumns, columnWidths, rowSelection?.enabled, rowExpandable?.enabled]);

    // --- Export Handlers ---
    const handleExportCSV = () => {
        const visibleCols = flatColumns.filter(col => visibleColumns[String(col.key)]);
        const rows = filteredData.map(row =>
            visibleCols.map(col => {
                const cellContent = col.render ? col.render(row) : row[col.key as keyof typeof row];
                return typeof cellContent === 'string' || typeof cellContent === 'number'
                    ? String(cellContent)
                    : String(row[col.key as keyof typeof row] ?? '');
            })
        );
        const csv = [
            visibleCols.map(col => col.header).join(','),
            ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);
        link.setAttribute('download', `export_${timestamp}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Data');
        const visibleCols = flatColumns.filter(col => visibleColumns[String(col.key)]);

        // Add headers with style
        const headerRow = worksheet.addRow(visibleCols.map(col => col.header));
        headerRow.eachCell(cell => {
            cell.font = { bold: true };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFCCCCCC' },
            };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
            };
        });

        filteredData.forEach(row => {
            const dataRow = worksheet.addRow(visibleCols.map(col => {
                const raw = col.render ? col.render(row) : row[col.key as keyof typeof row];
                return typeof raw === 'string' || typeof raw === 'number'
                    ? String(raw)
                    : typeof row[col.key as keyof typeof row] === 'object'
                        ? JSON.stringify(row[col.key as keyof typeof row])
                        : String(row[col.key as keyof typeof row] ?? '');
            }));

            dataRow.eachCell(cell => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' },
                };
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);
        link.setAttribute('download', `export_${timestamp}.xlsx`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        const visibleCols = flatColumns.filter(col => visibleColumns[String(col.key)]);
        const headers = [visibleCols.map(col => col.header)];
        const dataRows = filteredData.map(row =>
            visibleCols.map(col => {
                const cellContent = col.render ? col.render(row) : row[col.key as keyof typeof row];
                return typeof cellContent === 'string' || typeof cellContent === 'number'
                    ? String(cellContent)
                    : String(row[col.key as keyof typeof row] ?? '');
            })
        );
        autoTable(doc, {
            head: headers,
            body: dataRows,
        });
        const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);
        doc.save(`export_${timestamp}.pdf`);
    };

    // --- Hovered cell state for row/col highlight ---
    const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
    const [hoveredColKey, setHoveredColKey] = useState<string | null>(null);

    // --- Header checkbox indeterminate logic ---
    const headerCheckboxRef = useRef<HTMLInputElement | null>(null);
    const allSelected = pagedData.every((row, i) =>
        selectedRowKeys.has(resolveRowKey(row, i))
    );
    const noneSelected = pagedData.every((row, i) =>
        !selectedRowKeys.has(resolveRowKey(row, i))
    );
    useEffect(() => {
        if (headerCheckboxRef.current) {
            headerCheckboxRef.current.indeterminate = !allSelected && !noneSelected;
        }
    }, [allSelected, noneSelected]);

    return (
        <>
            <div className={gridContainer}>
                <div className={gridHeader}>
                    {(inputFilter || columnsVisibleOption || dataExport) && (() => {
                        // --- Export dropdown state and logic ---
                        const [openExportDropdown, setOpenExportDropdown] = useState(false);
                        const exportDropdownRef = useRef<HTMLButtonElement | null>(null);
                        const [exportDropdownPosition, setExportDropdownPosition] = useState<{ top: number; left: number } | null>(null);
                        useEffect(() => {
                            const handleResize = () => {
                                if (openExportDropdown && exportDropdownRef.current) {
                                    const rect = exportDropdownRef.current.getBoundingClientRect();
                                    setExportDropdownPosition({
                                        top: rect.bottom + window.scrollY,
                                        left: rect.left + window.scrollX,
                                    });
                                }
                            };
                            const handleClickOutside = (e: MouseEvent) => {
                                if (
                                    openExportDropdown &&
                                    exportDropdownRef.current &&
                                    !exportDropdownRef.current.contains(e.target as Node)
                                ) {
                                    setOpenExportDropdown(false);
                                }
                            };
                            window.addEventListener('resize', handleResize);
                            window.addEventListener('scroll', handleResize, true);
                            window.addEventListener('mousedown', handleClickOutside);
                            return () => {
                                window.removeEventListener('resize', handleResize);
                                window.removeEventListener('scroll', handleResize, true);
                                window.removeEventListener('mousedown', handleClickOutside);
                            };
                        }, [openExportDropdown]);
                        const exportDropdown = openExportDropdown && exportDropdownRef.current
                            ? createPortal(
                                <div
                                    className="absolute z-50 bg-stone-100 dark:bg-slate-800 border border-gray-300 dark:border-gray-600 mt-1 w-full min-w-20 rounded-xs shadow-xl"
                                    style={{
                                        position: 'absolute',
                                        top: exportDropdownPosition?.top ?? 0,
                                        left: exportDropdownPosition?.left ?? 0,
                                        width: exportDropdownRef.current?.offsetWidth ?? 150,
                                    }}
                                    onMouseDown={e => e.stopPropagation()}
                                >
                                    <div className="max-h-60 overflow-auto bg-stone-100 dark:bg-slate-400 p-1 space-y-1 shadow-xl">
                                        <button
                                            className="block w-full text-left text-sm px-2 py-1 hover:bg-gray-300 dark:hover:bg-amber-600"
                                            onClick={() => {
                                                handleExportCSV();
                                                setOpenExportDropdown(false);
                                            }}
                                        >
                                            <FontAwesomeIcon icon={faFileCsv} size='xl' className="mr-2" /> CSV
                                        </button>
                                        <button
                                            className="block w-full text-left text-sm px-2 py-1 hover:bg-gray-300 dark:hover:bg-amber-600"
                                            onClick={async () => {
                                                await handleExportExcel();
                                                setOpenExportDropdown(false);
                                            }}
                                        >
                                            <FontAwesomeIcon icon={faFileExcel} size='xl' className="mr-2 text-green-600" /> Excel
                                        </button>
                                        <button
                                            className="block w-full text-left text-sm px-2 py-1 hover:bg-gray-300 dark:hover:bg-amber-600"
                                            onClick={() => {
                                                handleExportPDF();
                                                setOpenExportDropdown(false);
                                            }}
                                        >
                                            <FontAwesomeIcon icon={faFilePdf} size='xl' className="mr-2 text-red-600" /> PDF
                                        </button>
                                    </div>
                                </div>,
                                document.body
                            )
                            : null;
                        // --- End Export dropdown logic ---
                        return (
                            <div className={`flex items-start gap-2 p-1 ${theadWrapper}`}>
                                {inputFilter && (
                                    <div className={inputFilterWrapper}>
                                        <Input
                                            type="text"
                                            placeholder="Search..."
                                            value={filterText}
                                            onChange={e => setFilterText(e.target.value)}
                                            className={inputFilterInput}
                                        />
                                    </div>
                                )}
                                {columnsVisibleOption && (() => {
                                    const [openColumnDropdown, setOpenColumnDropdown] = useState(false);
                                    const columnDropdownRef = useRef<HTMLButtonElement | null>(null);
                                    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);

                                    useEffect(() => {
                                        const handleResize = () => {
                                            if (openColumnDropdown && columnDropdownRef.current) {
                                                const rect = columnDropdownRef.current.getBoundingClientRect();
                                                setDropdownPosition({
                                                    top: rect.bottom + window.scrollY,
                                                    left: rect.left + window.scrollX,
                                                });
                                            }
                                        };
                                        const handleClickOutside = (e: MouseEvent) => {
                                            if (
                                                openColumnDropdown &&
                                                columnDropdownRef.current &&
                                                !columnDropdownRef.current.contains(e.target as Node)
                                            ) {
                                                setOpenColumnDropdown(false);
                                            }
                                        };
                                        window.addEventListener('resize', handleResize);
                                        window.addEventListener('scroll', handleResize, true);
                                        window.addEventListener('mousedown', handleClickOutside);
                                        return () => {
                                            window.removeEventListener('resize', handleResize);
                                            window.removeEventListener('scroll', handleResize, true);
                                            window.removeEventListener('mousedown', handleClickOutside);
                                        };
                                    }, [openColumnDropdown]);

                                    const dropdown = openColumnDropdown && columnDropdownRef.current
                                        ? createPortal(
                                            <div
                                                className="absolute z-50 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-600 mt-1 w-full min-w-60 rounded-xs shadow-xl"
                                                style={{
                                                    position: 'absolute',
                                                    top: dropdownPosition?.top ?? 0,
                                                    left: dropdownPosition?.left ?? 0,
                                                    width: columnDropdownRef.current?.offsetWidth ?? 200,
                                                }}
                                                onMouseDown={e => e.stopPropagation()}
                                            >
                                                <div className="max-h-60 overflow-auto bg-stone-100 dark:bg-slate-400 p-2 space-y-1 shadow-xl">
                                                    {flatColumns.map(col => (
                                                        <label key={String(col.key)} className="block text-base cursor-pointer px-1 py-0.5 hover:bg-gray-100 dark:hover:bg-amber-600">
                                                            <input
                                                                type="checkbox"
                                                                className="form-checkbox border-stone-300 dark:border-gray-500 mr-1"
                                                                checked={visibleColumns[String(col.key)]}
                                                                onChange={(e) =>
                                                                    setVisibleColumns(prev => ({
                                                                        ...prev,
                                                                        [String(col.key)]: e.target.checked
                                                                    }))
                                                                }
                                                            />
                                                            {col.header}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>,
                                            document.body
                                        )
                                        : null;

                                    return (
                                        <div className="relative z-10">
                                            <Button
                                                ref={columnDropdownRef}
                                                onClick={() => {
                                                    setOpenColumnDropdown(prev => {
                                                        const rect = columnDropdownRef.current?.getBoundingClientRect();
                                                        if (rect) {
                                                            setDropdownPosition({
                                                                top: rect.bottom + window.scrollY,
                                                                left: rect.left + window.scrollX,
                                                            });
                                                        }
                                                        return !prev;
                                                    });
                                                }}
                                                className={columnToggleButton}
                                                variant="default"
                                            >
                                                Visible Columns
                                            </Button>
                                            {dropdown}
                                        </div>
                                    );
                                })()}
                                {/* Export dropdown button */}
                                {dataExport && (
                                    <div className="relative z-10">
                                        <Button
                                            ref={exportDropdownRef}
                                            onClick={() => {
                                                setOpenExportDropdown(prev => {
                                                    const rect = exportDropdownRef.current?.getBoundingClientRect();
                                                    if (rect) {
                                                        setExportDropdownPosition({
                                                            top: rect.bottom + window.scrollY,
                                                            left: rect.left + window.scrollX,
                                                        });
                                                    }
                                                    return !prev;
                                                });
                                            }}
                                            className={exportButton}
                                            variant="default"
                                        >
                                            Export
                                        </Button>
                                        {exportDropdown}
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                    <div className={`${!pagination ? 'max-h-[500px] overflow-y-auto overflow-x-visible relative z-0' : ''}`}>
                        <table className={tableWrapper}>
                            <thead className={theadWrapper}>
                                <tr>
                                    {rowSelection?.enabled && (
                                        <th className="py-2 border-r border-gray-300 dark:border-slate-700 border-b-0 bg-gray-200 dark:bg-slate-700! text-center w-10">
                                            <Input
                                                ref={headerCheckboxRef}
                                                type="checkbox"
                                                className="form-checkbox w-4.5 h-4.5 border-stone-300 dark:border-gray-400"
                                                checked={allSelected}
                                                aria-checked={
                                                    allSelected ? "true" : (!noneSelected ? "mixed" : "false")
                                                }
                                                onChange={(e) => {
                                                    const selectableKeys = pagedData
                                                        .map((row, i) => ({
                                                            key: resolveRowKey(row, i),
                                                            selectable: !rowSelection.isSelectable || rowSelection.isSelectable(row)
                                                        }))
                                                        .filter(entry => entry.selectable)
                                                        .map(entry => entry.key);

                                                    const newSelected = new Set(selectedRowKeys);

                                                    if (e.target.checked) {
                                                        selectableKeys.forEach(key => newSelected.add(key));
                                                    } else {
                                                        selectableKeys.forEach(key => newSelected.delete(key));
                                                    }

                                                    setSelectedRowKeys(newSelected);
                                                }}
                                            />
                                        </th>
                                    )}
                                    {rowExpandable?.enabled && <th className="w-6 border-r border-gray-300 dark:border-slate-700 bg-gray-200 dark:bg-slate-700" />}
                                    {flatColumns.filter(col => visibleColumns[String(col.key)]).map(col => (
                                        <th
                                            key={String(col.key)}
                                            className="text-left px-4 py-2 border-b-0 dark:border-dark font-bold text-sm bg-gray-200 dark:bg-slate-700"
                                            style={{ width: columnWidths[String(col.key)] ?? 'auto' }}
                                            onClick={() => col.sortable && handleSort(col.key)}
                                        >
                                            <div className="flex items-center">
                                                <span>{col.header}</span>
                                                {col.sortable && (
                                                    <span className="ml-2 text-xs text-gray-500 transition-opacity">
                                                        {sortKey === col.key ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                                                    </span>
                                                )}
                                            </div>
                                            <span className={columnResizer} />
                                        </th>
                                    ))}
                                </tr>
                                {/* filter row */}
                                <tr className={theadFilterRow}>
                                    {rowSelection?.enabled && <td className="truncate border-r border-gray-300 dark:border-slate-700 bg-gray-200 dark:bg-slate-700" />}
                                    {rowExpandable?.enabled && <td className="truncate border-r border-gray-300 dark:border-slate-700 bg-gray-200 dark:bg-slate-700" />}
                                    {flatColumns.filter(col => visibleColumns[String(col.key)]).map((col) => (
                                        <td key={String(col.key)} className={`p-1 border-b dark:border-dark bg-gray-200 dark:bg-slate-700 truncate`}>
                                            {col.filter === 'input' && (
                                                <Input
                                                    type="text"
                                                    className={filterCellInput}
                                                    placeholder={`Search ${col.header}`}
                                                    onChange={e => {
                                                        setColumnFilters(prev => ({
                                                            ...prev,
                                                            [col.key]: e.target.value
                                                        }));
                                                    }}
                                                />
                                            )}
                                            {col.filter === 'singleSelect' && (
                                                <>
                                                    {/** Warn if fallback yields no options */}
                                                    {(() => {
                                                        useEffect(() => {
                                                            if (
                                                                col.filter === 'singleSelect' &&
                                                                !col.filterParams?.options &&
                                                                data.length > 0
                                                            ) {
                                                                const uniqueVals = Array.from(new Set(data.map(row => row[col.key] ?? '').filter(Boolean)));
                                                                if (uniqueVals.length === 0) {
                                                                    console.warn(`[DataGrid] Column '${String(col.key)}' (singleSelect) fallback yielded no options from data.`);
                                                                }
                                                            }
                                                        }, [col.key, data]);
                                                        return null;
                                                    })()}
                                                    <Select
                                                        value={columnFilters[col.key as string] ?? ""}
                                                        onValueChange={val => {
                                                            setColumnFilters(prev => ({
                                                                ...prev,
                                                                [col.key]: val
                                                            }));
                                                        }}
                                                    >
                                                        <SelectTrigger className={filterCellSelect}>
                                                            <SelectValue placeholder={`All`} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {/* Only render SelectItem if value is truthy/non-empty */}
                                                            {(
                                                                (col.filterParams?.options ??
                                                                    Array.from(new Set(data.map(row => row[col.key] ?? '').filter(Boolean))))
                                                                .filter((opt) => opt && String(opt) !== '')
                                                            ).map(opt => (
                                                                <SelectItem key={String(opt)} value={String(opt)}>
                                                                    {String(col.filterParams?.labelMap?.[String(opt)] ?? opt)}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </>
                                            )}
                                            {col.filter === 'multiSelect' && (
                                                (() => {
                                                    const buttonRef = useRef<HTMLButtonElement | null>(null);
                                                    // Dropdown position state for this column
                                                    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
                                                    // Effect to update position on open, resize, scroll
                                                    useEffect(() => {
                                                        const handleResize = () => {
                                                            if (openMultiSelect[String(col.key)] && buttonRef.current) {
                                                                const rect = buttonRef.current.getBoundingClientRect();
                                                                setDropdownPosition({
                                                                    top: rect.bottom + window.scrollY,
                                                                    left: rect.left + window.scrollX,
                                                                });
                                                            }
                                                        };
                                                        window.addEventListener('resize', handleResize);
                                                        window.addEventListener('scroll', handleResize, true);
                                                        return () => {
                                                            window.removeEventListener('resize', handleResize);
                                                            window.removeEventListener('scroll', handleResize, true);
                                                        };
                                                    }, [openMultiSelect[String(col.key)]]);
                                                    // Render dropdown via portal for this column
                                                    const dropdown =
                                                        openMultiSelect[String(col.key)] && buttonRef.current
                                                            ? createPortal(
                                                                <div
                                                                    className="absolute z-50 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-600 mt-1 w-full min-w-40 rounded-xs shadow-xl"
                                                                    style={{
                                                                        position: 'absolute',
                                                                        top: dropdownPosition?.top ?? 0,
                                                                        left: dropdownPosition?.left ?? 0,
                                                                        width: buttonRef.current?.offsetWidth ?? 200,
                                                                    }}
                                                                >
                                                                    <Input
                                                                        type="text"
                                                                        placeholder="Type to filter..."
                                                                        className="w-full form-input bg-transparent/10 max-w-full px-2 py-1 border-b rounded-xs text-sm sticky top-0 truncate"
                                                                        value={multiSelectSearch[col.key as string] || ''}
                                                                        onChange={e =>
                                                                            setMultiSelectSearch(prev => ({
                                                                                ...prev,
                                                                                [col.key as string]: e.target.value
                                                                            }))
                                                                        }
                                                                    />
                                                                    <div className="max-h-40 overflow-auto bg-stone-100 dark:bg-slate-400 shadow-xl">
                                                                        {col.filterParams?.options
                                                                            ?.filter(opt =>
                                                                                String(opt).toLowerCase().includes((multiSelectSearch[col.key as string] || '').toLowerCase())
                                                                            )
                                                                            .map(opt => (
                                                                                <label key={String(opt)} className="block text-sm px-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-amber-600">
                                                                                    <Input
                                                                                        type="checkbox"
                                                                                        value={String(opt)}
                                                                                        className="form-checkbox w-4 h-4 border-stone-300 dark:border-gray-400 mr-1"
                                                                                        checked={Array.isArray(columnFilters[col.key as string]) && columnFilters[col.key as string].includes(String(opt))}
                                                                                        onChange={e => {
                                                                                            setColumnFilters(prev => {
                                                                                                const existing = Array.isArray(prev[col.key as string]) ? prev[col.key as string] : [];
                                                                                                const updated = e.target.checked
                                                                                                    ? [...existing.map(String), String(opt)]
                                                                                                    : existing.map(String).filter((v: string) => v !== String(opt));
                                                                                                const newFilters = { ...prev };
                                                                                                if (updated.length > 0) {
                                                                                                    newFilters[col.key as string] = updated;
                                                                                                } else {
                                                                                                    delete newFilters[col.key as string];
                                                                                                }
                                                                                                return newFilters;
                                                                                            });
                                                                                        }}
                                                                                    />
                                                                                    {String(col.filterParams?.labelMap?.[String(opt)] ?? opt)}
                                                                                </label>
                                                                            ))}
                                                                    </div>
                                                                </div>,
                                                                document.body
                                                            )
                                                            : null;
                                                    return (
                                                        <div className="relative z-10 overflow-visible">
                                                            <button
                                                                ref={buttonRef}
                                                                onClick={() => {
                                                                    const key = String(col.key);
                                                                    // Compute and set dropdown position
                                                                    const rect = buttonRef.current?.getBoundingClientRect();
                                                                    if (rect) {
                                                                        setDropdownPosition({
                                                                            top: rect.bottom + window.scrollY,
                                                                            left: rect.left + window.scrollX,
                                                                        });
                                                                    }
                                                                    setOpenMultiSelect(prev => ({
                                                                        ...prev,
                                                                        [key]: !prev[key],
                                                                    }));
                                                                }}
                                                                className={filterCellSelect}
                                                            >
                                                                Select multiple
                                                            </button>
                                                            {dropdown}
                                                        </div>
                                                    );
                                                })()
                                            )}
                                            {col.filter === 'date' && (
                                                <Input type="date" className="w-full max-w-full px-1 py-0.5 border text-sm rounded-sm truncate" />
                                            )}
                                            {col.filter === 'dateRange' && (
                                                <div className="flex gap-1">
                                                    <Input type="date" className="w-full max-w-full px-1 py-0.5 border text-sm rounded-sm truncate" />
                                                    <Input type="date" className="w-full max-w-full px-1 py-0.5 border text-sm rounded-sm truncate" />
                                                </div>
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {pagedData.map((row, i) => {
                                    const key = resolveRowKey(row, i);
                                    return (
                                        <React.Fragment key={key}>
                                            <tr
                                                className={
                                                    `${sizeClass} ${rowClass?.(row) ?? 'even:bg-gray-50 dark:even:bg-slate-700 dark:odd:bg-slate-800'}`
                                                    + ((rowSelection?.isSelectable?.(row) !== false && selectedRowKeys.has(key)) ? ` ${rowSelected}` : '')
                                                    + ((key === highlightedRowKey && (!rowSelection?.enabled || !selectedRowKeys.has(key))) ? ` ${rowDoubleClicked}` : '')
                                                    + (expandedRows.has(key as number) ? ` ${rowExpanded}` : '')
                                                    + ` dark:text-dark-light ${rowHover}`
                                                }
                                                onClick={() => {
                                                    const now = Date.now();
                                                    const lastClickTime = rowClickTimestamps.current[key] || 0;
                                                    const timeDiff = now - lastClickTime;
                                                    rowClickTimestamps.current[key] = now;
                                                    if (timeDiff < 250) {
                                                        if (onRowDoubleClick) onRowDoubleClick(row);
                                                        setHighlightedRowKey(key);
                                                    }
                                                }}
                                            >
                                                {rowSelection?.enabled && (
                                                    <td
                                                        className={`${sizeClass} ${checkboxCell} ${expandedRows.has(key as number) ? 'border-t' : ''} border-t border-r dark:border-r-0 ${i % 2 === 0 ? 'even:bg-gray-50 dark:even:bg-slate-700 dark:odd:bg-slate-800' : ''}`}
                                                    >
                                                        {(!rowSelection.isSelectable || rowSelection.isSelectable(row)) ? (
                                                            <Input
                                                                type="checkbox"
                                                                className='form-checkbox w-4.5 h-4.5 dark:border-gray-400 '
                                                                checked={selectedRowKeys.has(key)}
                                                                onChange={e => {
                                                                    const newSelected = new Set(selectedRowKeys);
                                                                    if (e.target.checked) newSelected.add(key);
                                                                    else newSelected.delete(key);
                                                                    setSelectedRowKeys(newSelected);
                                                                }}
                                                            />
                                                        ) : null}
                                                    </td>
                                                )}
                                                {rowExpandable?.enabled && (
                                                    <td
                                                        className={
                                                            `${sizeClass} ` +
                                                            (expandedRows.has(key as number)
                                                                ? expandCellExpanded
                                                                : expandCellCollapsed)
                                                        }
                                                    >
                                                        <Button
                                                            onClick={() => {
                                                                const newExpanded = new Set(expandedRows);
                                                                if (newExpanded.has(key as number)) newExpanded.delete(key as number);
                                                                else newExpanded.add(key as number);
                                                                setExpandedRows(newExpanded);
                                                            }}
                                                            className={`${expandedRows.has(key as number) ? 'text-red-600 dark:text-red-800' : 'text-green-600 dark:text-green-700'}`}
                                                            aria-label="Toggle expand"
                                                            variant="ghost"
                                                        >
                                                            <FontAwesomeIcon icon={expandedRows.has(key as number) ? faMinus : faPlus} />
                                                        </Button>
                                                    </td>
                                                )}
                                                {flatColumns.filter(col => visibleColumns[String(col.key)]).map((col) => {
                                                    const isHighlighted = rowColHighlight && (hoveredRowIndex === i || hoveredColKey === String(col.key));
                                                    let highlightClass = '';
                                                    if (isHighlighted) {
                                                        highlightClass = (hoveredRowIndex === i && hoveredColKey === String(col.key))
                                                            ? hoveredCell
                                                            : hoveredRowOrCol;
                                                    }
                                                    return (
                                                        <td
                                                            key={String(col.key)}
                                                            className={`px-4 border-b ${expandedRows.has(key as number) ? expandedCellBorder : defaultCellBorder} truncate ${sizeClass} ${col.colClass ?? ''} ${col.colClassParams?.(row) ?? ''} ${highlightClass}`}
                                                            onMouseEnter={() => {
                                                                if (rowColHighlight) {
                                                                    setHoveredRowIndex(i);
                                                                    setHoveredColKey(String(col.key));
                                                                }
                                                            }}
                                                            onMouseLeave={() => {
                                                                if (rowColHighlight) {
                                                                    setHoveredRowIndex(null);
                                                                    setHoveredColKey(null);
                                                                }
                                                            }}
                                                        >
                                                            {col.render ? col.render(row) : String(row[col.key as keyof typeof row] ?? '')}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                            {rowExpandable?.enabled && expandedRows.has(key as number) && (
                                                <tr>
                                                    {rowSelection?.enabled && (
                                                        <td
                                                            className={`${sizeClass} ${expandedRowLeft}`}
                                                        />
                                                    )}
                                                    <td
                                                        className={`${sizeClass} ${expandedRowLeftSpacer}`}
                                                    >
                                                    </td>
                                                    <td
                                                        colSpan={flatColumns.filter(col => visibleColumns[String(col.key)]).length}
                                                        className={`${expandedRowContent.replace(/dark:border-dark/g, '')} ${sizeClass}`}
                                                    >
                                                        <table className="w-full table-fixed border-separate border-spacing-0 border-none">
                                                            <tbody>
                                                                <tr className="border-0 border-none">
                                                                    <td colSpan={flatColumns.filter(col => visibleColumns[String(col.key)]).length}>
                                                                        {rowExpandable?.render(row)}
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
                {!pagination && (
                    <div className="flex items-center justify-between p-2 text-sm border-t bg-gray-100 dark:bg-slate-800 dark:border-dark">
                        <div>Total entries: {sortedData.length}</div>
                        <div>
                            {rowSelection?.enabled && `Selected: ${selectedRowKeys.size}`}
                        </div>
                    </div>
                )}
            </div>
            {pagination && (
                <div className={paginationContainer}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div className="flex w-full items-end gap-2">
                            <label htmlFor="pageSize" className="text-sm max-w-[100px] dark:text-danger-light text-gray-600 font-normal">Page size:</label>
                            <Select
                                value={String(pageSize)}
                                onValueChange={(val) => {
                                    setCurrentPage(1);
                                    setPageSize(Number(val));
                                }}
                            >
                                <SelectTrigger className="form-select form-select-sm max-w-[100px] px-1 rounded-xs bg-white/50 truncate dark:text-danger-light focus:outline-hidden ">
                                    <SelectValue placeholder="Page size" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[10, 50, 100].map(size => (
                                        <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-1">
                            {(() => {
                                const maxVisiblePages = 5;
                                const pages = [];

                                // Prev button
                                pages.push(
                                    <Button
                                        key="prev"
                                        onClick={() => setCurrentPage(currentPage - 1)}
                                        className={paginationButton}
                                        disabled={currentPage === 1}
                                        variant="ghost"
                                    >
                                        Prev
                                    </Button>
                                );

                                if (totalPages <= maxVisiblePages + 4) {
                                    for (let page = 1; page <= totalPages; page++) {
                                        pages.push(
                                            <Button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`${paginationButton} ${currentPage === page ? paginationButtonActive : ''}`}
                                                variant="ghost"
                                            >
                                                {page}
                                            </Button>
                                        );
                                    }
                                } else {
                                    // Always show first page
                                    pages.push(
                                        <Button
                                            key={1}
                                            onClick={() => setCurrentPage(1)}
                                            className={`${paginationButton} ${currentPage === 1 ? paginationButtonActive : ''}`}
                                            variant="ghost"
                                        >
                                            1
                                        </Button>
                                    );

                                    // Show start ellipsis if currentPage > 4
                                    if (currentPage > 4) {
                                        pages.push(<span key="start-ellipsis" className="px-2">...</span>);
                                    }

                                    // Middle page range
                                    const start = Math.max(2, currentPage - 2);
                                    const end = Math.min(totalPages - 1, currentPage + 2);
                                    for (let page = start; page <= end; page++) {
                                        if (page !== 1 && page !== totalPages) {
                                            pages.push(
                                                <Button
                                                    key={page}
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`${paginationButton} ${currentPage === page ? paginationButtonActive : ''}`}
                                                    variant="ghost"
                                                >
                                                    {page}
                                                </Button>
                                            );
                                        }
                                    }

                                    // Show end ellipsis if currentPage < totalPages - 3
                                    if (currentPage < totalPages - 3) {
                                        pages.push(<span key="end-ellipsis" className="px-2">...</span>);
                                    }

                                    // Always show last page
                                    pages.push(
                                        <Button
                                            key={totalPages}
                                            onClick={() => setCurrentPage(totalPages)}
                                            className={`${paginationButton} ${currentPage === totalPages ? paginationButtonActive : ''}`}
                                            variant="ghost"
                                        >
                                            {totalPages}
                                        </Button>
                                    );
                                }

                                // Next button
                                pages.push(
                                    <Button
                                        key="next"
                                        onClick={() => setCurrentPage(currentPage + 1)}
                                        className={paginationButton}
                                        disabled={currentPage === totalPages}
                                        variant="ghost"
                                    >
                                        Next
                                    </Button>
                                );

                                return pages;
                            })()}
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm text-gray-600 dark:text-dark-light gap-2">
                        <span className='justify-start'>Showing {startEntry} to {endEntry} of {sortedData.length} entries</span>
                        {rowSelection?.enabled && (
                            <div>Selected: {selectedRowKeys.size}</div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export const CustomDataGrid = forwardRef(CustomDataGridInner) as <T>(
    props: DataGridProps<T> & {
        ref?: React.Ref<{
            deselectRow: (key: string | number) => void;
            clearSelectedRows: () => void;
        }>
    }
) => JSX.Element;
