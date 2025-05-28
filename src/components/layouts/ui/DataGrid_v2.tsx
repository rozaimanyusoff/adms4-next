/*
customdatagrid_features_guide.txt
*/
import React, { useMemo, useState, useEffect, useRef } from 'react';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { createPortal } from 'react-dom';
import type { FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faMinus, faFileExcel, faFileCsv, faFilePdf } from '@fortawesome/free-solid-svg-icons';

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

interface DataGridProps<T> {
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
    };
    /** Function to compute class name for a row based on row data */
    rowClass?: (row: T) => string;
    /** Option to allow toggling column visibility */
    columnsVisibleOption?: boolean;
    /** Option to enable export dropdown */
    dataExport?: boolean;
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
export const CustomDataGrid = <T,>({
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
}: DataGridProps<T>) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [sortKey, setSortKey] = useState<keyof T | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [filterText, setFilterText] = useState('');
    const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string | number>>(new Set());
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
        () => Object.fromEntries(columns.map(col => [String(col.key), col.columnVisible !== false]))
    );
    const [pageSize, setPageSize] = useState(initialPageSize);
    // Resizable columns state
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
            result = result.filter(row =>
                columns.some(col =>
                    String(row[col.key] ?? '').toLowerCase().includes(filterText.toLowerCase())
                )
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
            const dataSelected = sortedData.filter((row, i) => keys.includes(resolveRowKey(row, i)));
            rowSelection.onSelect(keys, dataSelected);
        }
    }, [selectedRowKeys]);

    // Auto-resize columns if columnWidths not set for a given column key
    useEffect(() => {
        // Determine offset for nth-child, accounting for rowSelection and rowExpandable columns
        let offset = 0;
        if (rowSelection?.enabled) offset += 1;
        if (rowExpandable?.enabled) offset += 1;

        // Only auto-resize if some columnWidths are missing
        const missingWidths = columns.some(col => columnWidths[String(col.key)] === undefined);
        if (!missingWidths) return;

        const table = document.querySelector('table');
        if (!table) return;

        const newWidths: Record<string, number> = {};
        columns.forEach((col, index) => {
            const cells = table.querySelectorAll(`tbody tr td:nth-child(${index + 1 + offset})`);
            const widths = Array.from(cells).map(cell => cell.scrollWidth);
            const max = Math.max(...widths, col.header.length * 8); // fallback for header
            newWidths[String(col.key)] = max + 20;
        });
        setColumnWidths(prev => ({ ...newWidths, ...prev }));
    }, [columns, columnWidths, rowSelection?.enabled, rowExpandable?.enabled]);

    // --- Export Handlers ---
    const handleExportCSV = () => {
        const visibleCols = columns.filter(col => visibleColumns[String(col.key)]);
        const rows = filteredData.map(row =>
            visibleCols.map(col => {
                const cellContent = col.render ? col.render(row) : row[col.key];
                return typeof cellContent === 'string' || typeof cellContent === 'number'
                    ? String(cellContent)
                    : String(row[col.key] ?? '');
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
        const visibleCols = columns.filter(col => visibleColumns[String(col.key)]);

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
                const raw = col.render ? col.render(row) : row[col.key];
                return typeof raw === 'string' || typeof raw === 'number'
                    ? String(raw)
                    : typeof row[col.key] === 'object'
                        ? JSON.stringify(row[col.key])
                        : String(row[col.key] ?? '');
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
        const visibleCols = columns.filter(col => visibleColumns[String(col.key)]);
        const headers = [visibleCols.map(col => col.header)];
        const dataRows = filteredData.map(row =>
            visibleCols.map(col => {
                const cellContent = col.render ? col.render(row) : row[col.key];
                return typeof cellContent === 'string' || typeof cellContent === 'number'
                    ? String(cellContent)
                    : String(row[col.key] ?? '');
            })
        );
        autoTable(doc, {
            head: headers,
            body: dataRows,
        });
        const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);
        doc.save(`export_${timestamp}.pdf`);
    };

    return (
        <>
            <div className="relative rounded-sm w-full transition-all duration-300 ease-in-out overflow-x-auto min-w-0 lg:min-w-[768px]">
                <div className="overflow-x-auto border dark:border-dark rounded-xs">
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
                            <div className="flex items-start gap-2 p-1 bg-gray-300 dark:bg-slate-900!">
                                {inputFilter && (
                                    <div className="grow">
                                        <input
                                            type="text"
                                            placeholder="Search..."
                                            value={filterText}
                                            onChange={e => setFilterText(e.target.value)}
                                            className="form-input bg-transparent/10 placeholder:text-base dark:placeholder:text-dark-light p-2 border rounded-xs w-full"
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
                                                    {columns.map(col => (
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
                                            <button
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
                                                className="form-select bg-transparent/10 placeholder:text-base placeholder:text-gray-600 dark:placeholder:text-dark-light p-2 border rounded-xs text-left truncate min-w-[150px]"
                                            >
                                                Visible Columns
                                            </button>
                                            {dropdown}
                                        </div>
                                    );
                                })()}
                                {/* Export dropdown button */}
                                {dataExport && (
                                    <div className="relative z-10">
                                        <button
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
                                            className="form-select bg-transparent/10 placeholder:text-base p-2 border rounded-xs text-left truncate min-w-[120px]"
                                        >
                                            Export
                                        </button>
                                        {exportDropdown}
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                    <div className={`${!pagination ? 'max-h-[500px] overflow-y-auto overflow-x-visible relative z-0' : ''}`}>
                        <table className="w-full border-collapse min-w-full whitespace-nowrap">
                            <thead className="bg-gray-300 dark:bg-slate-900! dark:text-dark-light sticky top-0 z-10">
                                <tr>
                                    {rowSelection?.enabled && (
                                        <th className="py-2 border-b-0 text-center w-10">
                                            <input
                                                type="checkbox"
                                                className="form-checkbox dark:border-gray-400"
                                                ref={el => {
                                                    if (!el) return;
                                                    const all = pagedData.every((row, i) => selectedRowKeys.has(resolveRowKey(row, i)));
                                                    const some = pagedData.some((row, i) => selectedRowKeys.has(resolveRowKey(row, i)));
                                                    el.indeterminate = !all && some;
                                                }}
                                                checked={pagedData.every((row, i) => selectedRowKeys.has(resolveRowKey(row, i)))}
                                                onChange={e => {
                                                    const newSelected = new Set(selectedRowKeys);
                                                    pagedData.forEach((row, i) => {
                                                        const key = resolveRowKey(row, i);
                                                        if (e.target.checked) newSelected.add(key);
                                                        else newSelected.delete(key);
                                                    });
                                                    setSelectedRowKeys(newSelected);
                                                }}
                                            />
                                        </th>
                                    )}
                                    {rowExpandable?.enabled && <th className="w-6 border-r border-gray-300 dark:border-slate-700" />}
                                    {columns.filter(col => visibleColumns[String(col.key)]).map(col => (
                                        <th
                                            key={String(col.key)}
                                            style={{ width: columnWidths[String(col.key)] ?? 'auto' }}
                                            className={`relative text-left px-4 py-2 border-b-0 dark:border-dark cursor-pointer select-none`}
                                            onClick={(e) => {
                                                if ((e.target as HTMLElement).classList.contains('column-resizer')) return;
                                                if (col.sortable) handleSort(col.key);
                                            }}
                                        >
                                            <div className="group flex items-center">
                                                <span>{col.header}</span>
                                                {col.sortable && (
                                                    <span
                                                        className={`ml-1 text-xs transition-opacity ${sortKey === col.key ? 'opacity-100' : 'group-hover:opacity-100 opacity-0'
                                                            }`}
                                                    >
                                                        {sortKey === col.key ? (sortDirection === 'asc' ? '🔼' : '🔽') : '🔽'}
                                                    </span>
                                                )}
                                            </div>
                                            {/* Resizer handle with visible separator and double-click auto-resize */}
                                            <span
                                                onMouseDown={e => {
                                                    e.stopPropagation();
                                                    const startX = e.clientX;
                                                    const key = String(col.key);
                                                    const initialWidth =
                                                        columnWidths[key] ??
                                                        (e.currentTarget.parentElement
                                                            ? e.currentTarget.parentElement.offsetWidth
                                                            : 150);
                                                    const handleMouseMove = (moveEvent: MouseEvent) => {
                                                        const deltaX = moveEvent.clientX - startX;
                                                        // Clamp width between 60 and 500
                                                        const newWidth = Math.min(Math.max(initialWidth + deltaX, 60), 500);
                                                        setColumnWidths(prev => ({
                                                            ...prev,
                                                            [key]: newWidth,
                                                        }));
                                                    };
                                                    const handleMouseUp = () => {
                                                        document.removeEventListener('mousemove', handleMouseMove);
                                                        document.removeEventListener('mouseup', handleMouseUp);
                                                    };
                                                    document.addEventListener('mousemove', handleMouseMove);
                                                    document.addEventListener('mouseup', handleMouseUp);
                                                }}
                                                onDoubleClick={e => {
                                                    // Find cell index (column index in header row)
                                                    const parentTh = e.currentTarget.parentElement;
                                                    const tr = parentTh?.parentElement;
                                                    if (!parentTh || !tr) return;
                                                    const cellIndex = Array.from(tr.children).indexOf(parentTh);
                                                    const key = String(col.key);
                                                    // Find all td cells in this column
                                                    const table = tr.parentElement?.parentElement?.parentElement as HTMLTableElement | undefined;
                                                    // Find tbody
                                                    const tbody = table?.querySelector('tbody');
                                                    if (!tbody) return;
                                                    const columnCells = tbody.querySelectorAll(`tr > td:nth-child(${cellIndex + 1})`);
                                                    const contentWidths = Array.from(columnCells).map(cell => cell.scrollWidth);
                                                    const maxContentWidth = Math.max(...contentWidths, 100);
                                                    setColumnWidths(prev => ({
                                                        ...prev,
                                                        [key]: maxContentWidth + 16,
                                                    }));
                                                }}
                                                /* column separator on table header for resizing */
                                                className="column-resizer absolute right-0 top-0 h-3/4 w-[4px] my-1 rounded-t-full rounded-b-full cursor-col-resize bg-gray-200 hover:bg-gray-500 transition"
                                                style={{ userSelect: 'none' }}
                                            />
                                        </th>
                                    ))}
                                </tr>
                                {/* filter row */}
                                <tr className="bg-gray-300 dark:bg-slate-800 text-sm border-b border-gray-300 dark:border-slate-700">
                                    {rowSelection?.enabled && <td className="truncate" />}
                                    {rowExpandable?.enabled && <td className="truncate" />}
                                    {columns.filter(col => visibleColumns[String(col.key)]).map((col) => (
                                        <td key={String(col.key)} className={`p-1 border-b dark:border-dark truncate`}>
                                            {col.filter === 'input' && (
                                                <input
                                                    type="text"
                                                    className="w-full form-input max-w-full px-1 py-0.5 border text-sm rounded-xs dark:placeholder:text-dark-light"
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
                                                    <select
                                                        className="w-full form-select max-w-full px-1 py-0.5 border capitalize text-sm rounded-xs truncate dark:text-dark-light"
                                                        onChange={e => {
                                                            setColumnFilters(prev => ({
                                                                ...prev,
                                                                [col.key]: e.target.value
                                                            }));
                                                        }}
                                                    >
                                                        <option value="">All</option>
                                                        {(col.filterParams?.options ??
                                                            Array.from(new Set(data.map(row => row[col.key] ?? '').filter(Boolean)))) // fallback to unique values
                                                            .map(opt => (
                                                                <option key={String(opt)} value={String(opt)}>
                                                                    {String(col.filterParams?.labelMap?.[String(opt)] ?? opt)}
                                                                </option>
                                                            ))}
                                                    </select>
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
                                                                    <input
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
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        value={String(opt)}
                                                                                        className="form-checkbox w-4 h-4 border-stone-300 dark:border-gray-500 mr-1"
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
                                                                className="w-full form-select dark:text-dark-light max-w-full px-1 py-0.5 border text-sm rounded-xs text-left truncate"
                                                            >
                                                                Select multiple
                                                            </button>
                                                            {dropdown}
                                                        </div>
                                                    );
                                                })()
                                            )}
                                            {col.filter === 'date' && (
                                                <input type="date" className="w-full max-w-full px-1 py-0.5 border text-sm rounded-sm truncate" />
                                            )}
                                            {col.filter === 'dateRange' && (
                                                <div className="flex gap-1">
                                                    <input type="date" className="w-full max-w-full px-1 py-0.5 border text-sm rounded-sm truncate" />
                                                    <input type="date" className="w-full max-w-full px-1 py-0.5 border text-sm rounded-sm truncate" />
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
                                                className={`${rowClass?.(row) ?? 'even:bg-gray-50 dark:bg-slate-700'} ${expandedRows.has(key as number) ? 'bg-amber-200! dark:bg-amber-600!' : ''} dark:text-dark-light hover:bg-amber-100 dark:hover:bg-amber-600 dark:hover:font-semibold dark:hover:text-white ${rowSelection?.enabled && selectedRowKeys.has(key) ? 'bg-amber-200! dark:bg-amber-800!' : ''
                                                    }`}
                                            >
                                                {rowSelection?.enabled && (
                                                    <td
                                                        className={`dark:border-dark text-center bg-white dark:bg-slate-800 ${expandedRows.has(key as number) ? 'border-t' : ''} border-t`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className='form-checkbox dark:border-gray-400'
                                                            checked={selectedRowKeys.has(key)}
                                                            onChange={e => {
                                                                const newSelected = new Set(selectedRowKeys);
                                                                if (e.target.checked) newSelected.add(key);
                                                                else newSelected.delete(key);
                                                                setSelectedRowKeys(newSelected);
                                                            }}
                                                        />
                                                    </td>
                                                )}
                                                {rowExpandable?.enabled && (
                                                    <td
                                                        className={`border-r dark:border-dark dark:border-r-slate-700 text-center bg-white dark:bg-slate-800 ${expandedRows.has(key as number) ? 'border-t' : 'border-t'}`}
                                                    >
                                                        <button
                                                            onClick={() => {
                                                                const newExpanded = new Set(expandedRows);
                                                                if (newExpanded.has(key as number)) newExpanded.delete(key as number);
                                                                else newExpanded.add(key as number);
                                                                setExpandedRows(newExpanded);
                                                            }}
                                                            className="text-green-600"
                                                            aria-label="Toggle expand"
                                                        >
                                                            <FontAwesomeIcon icon={expandedRows.has(key as number) ? faMinus : faPlus} />
                                                        </button>
                                                    </td>
                                                )}
                                                {columns.filter(col => visibleColumns[String(col.key)]).map(col => (
                                                    <td
                                                        key={String(col.key)}
                                                        className={`px-4 py-2 border-b dark:border-dark truncate ${col.colClass ?? ''} ${col.colClassParams?.(row) ?? ''}`}
                                                    >
                                                        {col.render ? col.render(row) : String(row[col.key] ?? '')}
                                                    </td>
                                                ))}
                                            </tr>
                                            {expandedRows.has(key as number) && (
                                                <tr>
                                                    {rowSelection?.enabled && <td className="dark:border-dark" />}
                                                    {rowExpandable?.enabled && <td className="border-r dark:border-dark dark:border-r-slate-700" />}
                                                    <td colSpan={columns.filter(col => visibleColumns[String(col.key)]).length} className="bg-amber-200 dark:bg-amber-600 dark:text-dark-light px-4 py-2 border-t-0 dark:border-t-0">
                                                        <table className="w-full table-fixed border-separate border-spacing-0">
                                                            <tbody>
                                                                <tr>
                                                                    <td colSpan={columns.filter(col => visibleColumns[String(col.key)]).length}>
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
                <div className="bg-gray-100 dark:bg-slate-800 dark:border-dark p-2 space-y-2">
                    <div className="flex justify-between items-center">
                        <div className="flex w-full items-center gap-2">
                            <label htmlFor="pageSize" className="text-sm max-w-[100px] dark:text-danger-light">Page size:</label>
                            <select
                                id="pageSize"
                                className="form-select max-w-[100px] px-1 py-0.5 rounded-xs capitalizerounded-sm truncate dark:text-danger-light focus:outline-hidden "
                                value={pageSize}
                                onChange={(e) => {
                                    setCurrentPage(1);
                                    setPageSize(Number(e.target.value));
                                }}
                            >
                                {[10, 50, 100].map(size => (
                                    <option key={size} value={size}>{size}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className="px-3 py-1 border rounded-sm disabled:opacity-50 dark:text-danger-light"
                                disabled={currentPage === 1}
                            >
                                Prev
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`px-3 py-1 border rounded-sm ${currentPage === page ? 'bg-blue-600 text-white dark:text-danger-light font-semibold' : ''}`}
                                >
                                    {page}
                                </button>
                            ))}
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                className="px-3 py-1 border rounded-sm disabled:opacity-50"
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-600 dark:text-dark-light">
                        <div>Showing {startEntry} to {endEntry} of {sortedData.length} entries</div>
                        {rowSelection?.enabled && (
                            <div>Selected: {selectedRowKeys.size}</div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};
