/* eslint-disable react-hooks/rules-of-hooks */
 
 
 

/* Grid Container */
const gridContainer = "relative rounded-none w-full transition-all duration-300 ease-in-out min-w-0 lg:min-w-[768px]";
const gridHeader = "border border-b-0 border-border rounded-none";

/* Input Filter */
const inputFilterWrapper = "grow";
const inputFilterInput = "form-input border-0 border-b form-input-sm bg-transparent/10 placeholder:text-sm text-foreground placeholder:text-muted-foreground p-2 border rounded-none w-full";

/* Column Visibility Toggle */
const columnToggleButton = "placeholder:text-base text-white placeholder:text-muted-foreground p-2 border border-border rounded-xs text-left truncate min-w-[150px]";
const columnToggleItem = "block text-base cursor-pointer px-1 py-0.5 hover:bg-accent hover:text-accent-foreground";

/* Export Dropdown */
const exportButton = "placeholder:text-base text-white p-2 border border-border dark:bg-gray-700 rounded-xs text-left truncate min-w-[120px]";
const exportMenuItem = "block w-full text-left text-sm px-2 py-1 hover:bg-accent hover:text-accent-foreground";

/* Table Structure */
const tableWrapper = "w-full border-collapse min-w-full table-auto";
const theadWrapper = "bg-card sticky top-0 z-10";
const theadTh = "relative text-left px-4 py-2 border-b-0 border-border cursor-pointer select-none text-card-foreground";
const columnResizer = "column-resizer absolute right-0 top-0 h-3/4 w-[4px] my-1 rounded-t-full rounded-b-full cursor-col-resize bg-muted hover:bg-muted-foreground transition";

/* Column Filters */
const theadFilterRow = "bg-muted text-sm border-b border-border";
const filterCellInput = "w-full bg-background max-w-full px-1 py-0.5 border border-border text-xs rounded-xs text-foreground placeholder:text-muted-foreground";
const filterCellSelect = "w-full bg-background max-w-full px-1 py-0.5 border border-border capitalize text-xs rounded-xs truncate text-foreground";

/* Row Styling */
const rowSelected = "bg-primary/20 dark:bg-primary/30";
const rowDoubleClicked = "bg-primary/10 dark:bg-primary/20";
const rowExpanded = "bg-accent dark:bg-accent";
const rowHover = "hover:bg-accent hover:text-accent-foreground";
const expandedCellBorder = "border-primary/20";
const defaultCellBorder = "border-border";

/* Checkbox */
const checkboxCell = "text-center even:bg-muted/50 border-t border-border";

/* Expand Button Cells */
const expandCellCollapsed = "border-b border-r border-border";
const expandCellExpanded = "bg-accent border-x border-b border-accent";

/* Hovered Cell Highlight */
const hoveredCell = "bg-accent text-accent-foreground font-extrabold";
const hoveredRowOrCol = "bg-accent font-extrabold";

/* Expanded Row */
const expandedRowLeft = "bg-accent border-x border-b border-accent";
const expandedRowLeftSpacer = "border-l border-b border-accent bg-accent";
const expandedRowContent = "bg-accent border-x border-b border-accent text-accent-foreground px-4 py-2";

/* Pagination */
const paginationContainer = "bg-muted border border-t-0 border-border dark:bg-gray-800 p-2 space-y-3";
const paginationButton = "px-2 py-1 text-xs border border-border rounded-sm disabled:opacity-50 text-foreground";
const paginationButtonActive = "bg-primary text-primary-foreground border-primary font-semibold";

/*
customdatagrid_features_guide.txt
*/
import React, { useMemo, useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { useTextSize } from "@/contexts/text-size-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { createPortal } from 'react-dom';
import type { FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faMinus, faFileExcel, faFileCsv, faFilePdf, faGear } from '@fortawesome/free-solid-svg-icons';
import { Plus, Minus, X } from 'lucide-react';

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
	/** Custom render function for a cell. Second arg is 1-based row number in current view/export. */
	render?: (row: T, index?: number) => React.ReactNode;
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
	/** Option to show grid settings button */
	gridSettings?: boolean;
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
	/** Optional key for localStorage pagination persistence */
	persistenceKey?: string;
	/** Option to persist pagination and pageSize in localStorage */
	persistPagination?: boolean;
	/** Optional list of column keys to treat as chained filters in order */
	chainedFilters?: string[];
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

const startOfDay = (date: Date) => {
	const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	normalized.setHours(0, 0, 0, 0);
	return normalized;
};

const parseDateString = (input: string): Date | null => {
	if (!input) return null;
	const trimmed = input.trim();
	if (!trimmed) return null;
	const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (isoMatch) {
		const [, yyyy, mm, dd] = isoMatch;
		return startOfDay(new Date(Number(yyyy), Number(mm) - 1, Number(dd)));
	}
	const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
	if (slashMatch) {
		const [, dd, mm, yyyy] = slashMatch;
		return startOfDay(new Date(Number(yyyy), Number(mm) - 1, Number(dd)));
	}
	try {
		const normalized = trimmed.includes(' ') && !trimmed.includes('T')
			? trimmed.replace(' ', 'T')
			: trimmed;
		const parsed = new Date(normalized);
		if (!isNaN(parsed.getTime())) {
			return startOfDay(parsed);
		}
	} catch {
		// ignore parse failure
	}
	return null;
};

const parseUnknownDate = (value: unknown): Date | null => {
	if (value == null) return null;
	if (value instanceof Date && !isNaN(value.getTime())) {
		return startOfDay(value);
	}
	if (typeof value === 'number' && !Number.isNaN(value)) {
		return startOfDay(new Date(value));
	}
	if (typeof value === 'string') {
		return parseDateString(value);
	}
	return null;
};

// When building filter options or comparing singleSelect values, prefer a human-readable string.
// 1) Use the raw primitive value if string/number
// 2) Else, if the column provides a render function that returns string/number, use that
// 3) Else, attempt common display fields on objects (name/label/title)
// 4) Fallback to empty string
const getCellComparableValue = <T,>(row: T, col: ColumnDef<T>): string => {
	const raw = row[col.key as keyof T] as unknown;
	if (typeof raw === 'string' || typeof raw === 'number') return String(raw);
	const rendered = col.render?.(row) as unknown;
	if (typeof rendered === 'string' || typeof rendered === 'number') return String(rendered);
	if (raw && typeof raw === 'object') {
		const candidate = (raw as any);
		for (const k of ['name', 'label', 'title']) {
			if (candidate && typeof candidate[k] !== 'undefined') return String(candidate[k]);
		}
	}
	return '';
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
	gridSettings,
	// panelTool removed from usage
	theme,
	onRowDoubleClick,
	onRowSelected,
	persistenceKey,
	persistPagination,
	chainedFilters, // new prop
}: DataGridProps<T>, ref: React.Ref<{
	deselectRow: (key: string | number) => void;
	clearSelectedRows: () => void;
}>) => {
	const [currentPage, setCurrentPage] = useState(1);
	const [isHydrated, setIsHydrated] = useState(false);
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
		// Hydrate from localStorage after component mounts (client-side only)
		if (persistPagination && typeof window !== "undefined") {
			const storedPage = localStorage.getItem(`customDataGrid_${persistenceKey ?? 'default'}_page`);
			if (storedPage) {
				setCurrentPage(parseInt(storedPage));
			}
		}
		setIsHydrated(true);
	}, [persistPagination, persistenceKey]);

	useEffect(() => {
		if (isHydrated && persistPagination && typeof window !== "undefined") {
			localStorage.setItem(`customDataGrid_${persistenceKey ?? 'default'}_page`, String(currentPage));
		}
	}, [currentPage, persistPagination, persistenceKey, isHydrated]);
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

	useEffect(() => {
		// Hydrate pageSize from localStorage after component mounts (client-side only)
		if (persistPagination && typeof window !== "undefined") {
			const storedPageSize = localStorage.getItem(`customDataGrid_${persistenceKey ?? 'default'}_pageSize`);
			if (storedPageSize) {
				setPageSize(parseInt(storedPageSize));
			}
		}
	}, [persistPagination, persistenceKey, initialPageSize]);

	useEffect(() => {
		if (isHydrated && persistPagination && typeof window !== "undefined") {
			localStorage.setItem(`customDataGrid_${persistenceKey ?? 'default'}_pageSize`, String(pageSize));
		}
	}, [pageSize, persistPagination, persistenceKey, isHydrated]);
	// Resizable columns state
	// -- Filter type state for column filter menu
	const [filterTypes, setFilterTypes] = useState<Record<string, 'input' | 'dropdown' | 'none'>>({});

	// Handler for filter type change from column menu
	const handleFilterTypeChange = (key: keyof T, type: 'input' | 'dropdown' | 'none') => {
		setFilterTypes(prev => ({ ...prev, [key]: type }));
	};
	// State for double-clicked highlighted row
	const [highlightedRowKey, setHighlightedRowKey] = useState<string | number | null>(null);

	// Grid settings state
	const [paginationEnabled, setPaginationEnabled] = useState(pagination);

	// Track if content needs vertical scrolling
	const [needsVerticalScroll, setNeedsVerticalScroll] = useState(false);
	const tableContainerRef = useRef<HTMLDivElement>(null);

	// Get text size from context
	const { textSizeClasses } = useTextSize();

	// Dynamic classes that use textSize
	const dynamicPaginationButton = `px-2 py-1 ${textSizeClasses.small} border border-border rounded-sm disabled:opacity-50 text-foreground`;
	const dynamicPaginationButtonActive = "bg-primary text-primary-foreground border-primary font-semibold";
	const dynamicFilterCellInput = `w-full bg-background max-w-full px-1 py-0.5 border border-border ${textSizeClasses.small} rounded-xs text-foreground placeholder:text-muted-foreground`;
	const dynamicFilterCellSelect = `w-full bg-background max-w-full px-2 py-[10px] rounded border border-border capitalize ${textSizeClasses.small} rounded-xs truncate text-foreground`;
	const dynamicFilterCellDate = `w-full bg-background max-w-full px-2 py-0.5 rounded border border-border ${textSizeClasses.small} rounded-xs truncate text-foreground placeholder:text-muted-foreground`;
	const dynamicTheadFilterRow = `bg-muted ${textSizeClasses.base} border-b border-border`;

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
	const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
	// Resizing logic
	const handleColumnResize = (key: string, deltaX: number) => {
		setColumnWidths(prev => ({
			...prev,
			[key]: Math.max((prev[key] || 150) + deltaX, 50),
		}));
	};
	const [columnFilters, setColumnFilters] = useState<Record<string, string | string[]>>({});
	const updateDateFilter = useCallback((key: string, value: string | null) => {
		setCurrentPage(1);
		setColumnFilters(prev => {
			const current = prev[key];
			if (!value || value.trim() === "") {
				if (current === undefined) return prev;
				const next = { ...prev };
				delete next[key];
				return next;
			}
			if (current === value) return prev;
			const next = { ...prev };
			next[key] = value;
			return next;
		});
	}, []);
	const updateDateRangeFilter = useCallback((key: string, values: string[]) => {
		const sanitized = values.filter(Boolean);
		setCurrentPage(1);
		setColumnFilters(prev => {
			const current = prev[key];
			if (sanitized.length === 0) {
				if (current === undefined) return prev;
				const next = { ...prev };
				delete next[key];
				return next;
			}
			if (Array.isArray(current) && current.length === sanitized.length && current.every((val, idx) => val === sanitized[idx])) {
				return prev;
			}
			const next = { ...prev };
			next[key] = sanitized;
			return next;
		});
	}, []);
	// Dropdown open state for multiSelect filters
	const [openMultiSelect, setOpenMultiSelect] = useState<Record<string, boolean>>({});
	// Track filter text for each multiSelect
	const [multiSelectSearch, setMultiSelectSearch] = useState<Record<string, string>>({});

	// Export dropdown state
	const [openExportDropdown, setOpenExportDropdown] = useState(false);
	const exportDropdownRef = useRef<HTMLButtonElement | null>(null);
	const [exportDropdownPosition, setExportDropdownPosition] = useState<{ top: number; left: number } | null>(null);

	// Column dropdown state
	const [openColumnDropdown, setOpenColumnDropdown] = useState(false);
	const columnDropdownRef = useRef<HTMLButtonElement | null>(null);
	const [columnDropdownPosition, setColumnDropdownPosition] = useState<{ top: number; left: number } | null>(null);

	// Export dropdown positioning effect
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

	// Column dropdown positioning effect
	useEffect(() => {
		const handleResize = () => {
			if (openColumnDropdown && columnDropdownRef.current) {
				const rect = columnDropdownRef.current.getBoundingClientRect();
				setColumnDropdownPosition({
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

	const filteredData = useMemo(() => {
		let result = [...data];

		// Global text filter
		if (filterText) {
			const search = filterText.toLowerCase();
			result = result.filter(row =>
				columns.some(col => {
					// Use the raw value for filtering to avoid JSX conversion issues
					const value: any = row[col.key];

					// Special handling for searchable fields (like searchableUserName)
					if (typeof value === 'string' && value.includes(' ')) {
						return value.toLowerCase().includes(search);
					}

					// For other string/number fields
					if (typeof value === 'string' || typeof value === 'number') {
						return String(value).toLowerCase().includes(search);
					}

					// For arrays (like permissions)
					if (Array.isArray(value)) {
						return value.some(item => {
							if (typeof item === 'object' && item !== null) {
								return Object.values(item).some(v =>
									String(v).toLowerCase().includes(search)
								);
							}
							return String(item).toLowerCase().includes(search);
						});
					}

					// For objects, search through values
					if (typeof value === 'object' && value !== null) {
						return Object.values(value).some(v =>
							String(v).toLowerCase().includes(search)
						);
					}

					return false;
				})
			);
		}

		// Per-column filters
		Object.entries(columnFilters).forEach(([key, value]) => {
			if (value == null) return;
			if (typeof value === 'string' && value === '') return;
			if (Array.isArray(value) && value.length === 0) return;

			// Find the column configuration to determine filter type
			const column = flatColumns.find(col => String(col.key) === key);

			result = result.filter(row => {
				const cellValue = row[key as keyof T];

				if (column?.filter === 'date') {
					const filterVal = Array.isArray(value) ? value[0] : String(value);
					if (!filterVal) return true;
					const filterDate = parseDateString(filterVal);
					if (!filterDate) return true;
					const cellDate = parseUnknownDate(cellValue);
					if (!cellDate) return false;
					return cellDate.getTime() === filterDate.getTime();
				}

				if (column?.filter === 'dateRange') {
					let rangeValues: string[] = [];
					if (Array.isArray(value)) {
						rangeValues = value.filter(Boolean).map(v => String(v));
					} else if (typeof value === 'string') {
						rangeValues = value.split(/\s+to\s+/i).filter(Boolean);
					}
					if (rangeValues.length === 0) return true;

					const [startStr, endStr] = [rangeValues[0], rangeValues[1]];
					const startDate = startStr ? parseDateString(startStr) : null;
					const endDate = endStr ? parseDateString(endStr) : null;

					if (!startDate && !endDate) return true;

					const cellDate = parseUnknownDate(cellValue);
					if (!cellDate) return false;

					if (startDate && cellDate < startDate) return false;
					if (endDate && cellDate > endDate) return false;
					return true;
				}

				if (column?.filter === 'multiSelect' && Array.isArray(value)) {
					if (value.length === 0) return true;
					return value.some(v => {
						const filterVal = String(v).toLowerCase();
						if (Array.isArray(cellValue)) {
							return cellValue.some(cv => String(cv).toLowerCase() === filterVal);
						}
						return String(cellValue ?? '').toLowerCase() === filterVal;
					});
				}

				if (column?.filter === 'singleSelect') {
					// Single select filter - exact match against a comparable string
					const filterVal = String(value);
					const compareValue = getCellComparableValue(row, column);
					return compareValue === filterVal;
				}

				// Input filter (default) - contains match
				const filterVal = String(value).toLowerCase();
				if (Array.isArray(cellValue)) {
					return cellValue.some(cv =>
						String(cv).toLowerCase().includes(filterVal)
					);
				}
				return String(cellValue ?? '').toLowerCase().includes(filterVal);
			});
		});

		return result;
	}, [filterText, data, columns, columnFilters]);

	const sortedData = useMemo(() => {
		if (!sortKey) return filteredData;
		return sortData(filteredData, sortKey, sortDirection);
	}, [filteredData, sortKey, sortDirection]);

	const pagedData = useMemo(() => {
		if (!paginationEnabled) return sortedData;
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
			// alert removed: no popup on row selection
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
            const nodeList = table.querySelectorAll(`tbody tr td:nth-child(${index + 1 + offset})`);
            // Ignore cells that span multiple columns (e.g., the "No data" cell)
            const cells = Array.from(nodeList).filter(cell => (cell as HTMLTableCellElement).colSpan === 1);
            const widths = cells.map(cell => (cell as HTMLElement).scrollWidth);
            const fallback = col.header.length * 8; // fallback based on header length
            const max = widths.length > 0 ? Math.max(...widths, fallback) : fallback;
            newWidths[String(col.key)] = max + 20;
        });
        setColumnWidths(prev => ({ ...newWidths, ...prev }));
	}, [flatColumns, columnWidths, rowSelection?.enabled, rowExpandable?.enabled]);

	// Check if content needs vertical scrolling
	useEffect(() => {
		if (!paginationEnabled && tableContainerRef.current) {
			const container = tableContainerRef.current;

			const checkScrollNeeded = () => {
				const needsScroll = container.scrollHeight > container.clientHeight;
				setNeedsVerticalScroll(needsScroll);
			};

			// Initial check
			checkScrollNeeded();

			// Use ResizeObserver to watch for content changes
			const resizeObserver = new ResizeObserver(checkScrollNeeded);
			resizeObserver.observe(container);

			// Also listen for window resize
			const handleWindowResize = () => setTimeout(checkScrollNeeded, 100);
			window.addEventListener('resize', handleWindowResize);

			return () => {
				resizeObserver.disconnect();
				window.removeEventListener('resize', handleWindowResize);
			};
		}
	}, [pagedData, paginationEnabled, visibleColumns]);

	// --- Export Handlers ---
	const handleExportCSV = () => {
		const visibleCols = flatColumns.filter(col => visibleColumns[String(col.key)]);
		const rows = filteredData.map((row, i) =>
			visibleCols.map(col => {
				const cellContent = col.render ? col.render(row, i + 1) : row[col.key as keyof typeof row];
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

		filteredData.forEach((row, i) => {
			const dataRow = worksheet.addRow(visibleCols.map(col => {
				const raw = col.render ? col.render(row, i + 1) : row[col.key as keyof typeof row];
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
		const dataRows = filteredData.map((row, i) =>
			visibleCols.map(col => {
				const cellContent = col.render ? col.render(row, i + 1) : row[col.key as keyof typeof row];
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

	// Export dropdown component
	const exportDropdown = isMounted && openExportDropdown && exportDropdownRef.current
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

	// Column dropdown component
	const columnDropdown = isMounted && openColumnDropdown && columnDropdownRef.current
		? createPortal(
			<div
				className="absolute z-50 bg-popover text-popover-foreground border border-border mt-1 w-full min-w-60 rounded-xs shadow-xl"
				style={{
					position: 'absolute',
					top: columnDropdownPosition?.top ?? 0,
					left: columnDropdownPosition?.left ?? 0,
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
        <>
            <div className={gridContainer}>
				<div className={gridHeader}>
					{(inputFilter || columnsVisibleOption || dataExport || gridSettings) && (() => {
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
												className="absolute z-50 bg-popover text-popover-foreground border border-border mt-1 w-full min-w-60 rounded-xs shadow-xl"
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
												size={'sm'}
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
												type='button'
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
											size={'sm'}
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
								{/* Grid Settings Button */}
								{gridSettings && (() => {
									const [openSettingsDropdown, setOpenSettingsDropdown] = useState(false);
									const settingsDropdownRef = useRef<HTMLButtonElement | null>(null);
									const [settingsDropdownPosition, setSettingsDropdownPosition] = useState<{ top: number; left: number } | null>(null);

									useEffect(() => {
										const handleResize = () => {
											if (openSettingsDropdown && settingsDropdownRef.current) {
												const rect = settingsDropdownRef.current.getBoundingClientRect();
												setSettingsDropdownPosition({
													top: rect.bottom + window.scrollY,
													left: rect.left + window.scrollX,
												});
											}
										};
										const handleClickOutside = (e: MouseEvent) => {
											if (
												openSettingsDropdown &&
												settingsDropdownRef.current &&
												!settingsDropdownRef.current.contains(e.target as Node) &&
												!document.querySelector('.settings-dropdown')?.contains(e.target as Node)
											) {
												setOpenSettingsDropdown(false);
											}
										};

										window.addEventListener('resize', handleResize);
										document.addEventListener('click', handleClickOutside);
										return () => {
											window.removeEventListener('resize', handleResize);
											document.removeEventListener('click', handleClickOutside);
										};
									}, [openSettingsDropdown]);

									const settingsDropdown = openSettingsDropdown && settingsDropdownPosition
										? createPortal(
											<div
												className="settings-dropdown bg-card border border-border rounded-md shadow-lg py-1 z-50 absolute min-w-[150px]"
												style={{
													top: settingsDropdownPosition.top,
													left: settingsDropdownPosition.left,
												}}
											>
												<div className="px-3 py-2 text-sm font-medium text-card-foreground border-b border-border">
													Grid Settings
												</div>
												<button
													className={`block w-full text-left text-sm px-3 py-2 hover:bg-accent hover:text-accent-foreground ${paginationEnabled ? 'bg-accent text-accent-foreground' : ''}`}
													onClick={() => {
														setPaginationEnabled(true);
														setOpenSettingsDropdown(false);
													}}
												>
													Enable Pagination
												</button>
												<button
													className={`block w-full text-left text-sm px-3 py-2 hover:bg-accent hover:text-accent-foreground ${!paginationEnabled ? 'bg-accent text-accent-foreground' : ''}`}
													onClick={() => {
														setPaginationEnabled(false);
														setOpenSettingsDropdown(false);
													}}
												>
													Disable Pagination
												</button>
											</div>,
											document.body
										)
										: null;

									return (
										<div className="relative z-10">
											<Button
												ref={settingsDropdownRef}
												size={'sm'}
												onClick={() => {
													setOpenSettingsDropdown(prev => {
														const rect = settingsDropdownRef.current?.getBoundingClientRect();
														if (rect) {
															setSettingsDropdownPosition({
																top: rect.bottom + window.scrollY,
																left: rect.left + window.scrollX,
															});
														}
														return !prev;
													});
												}}
												className={exportButton}
												variant="default"
												title="Grid settings"
											>
												<FontAwesomeIcon icon={faGear} className="mr-2" />
												Settings
											</Button>
											{settingsDropdown}
										</div>
									);
								})()}
							</div>
						);
					})()}
					{/* Horizontal scroll wrapper for table */}
					<div className="overflow-x-auto border border-border rounded-sm">
						<div
							ref={tableContainerRef}
							className={!paginationEnabled ? 'max-h-[min(70vh,600px)] relative z-0' : ''}
							style={{
								...((!paginationEnabled) && {
									overflowY: needsVerticalScroll ? 'auto' : 'visible',
									scrollbarWidth: 'thin'
								})
							}}>
							<table className={tableWrapper}>
								<thead className={theadWrapper}>
									<tr>
										{rowSelection?.enabled && (
											<th className="py-2 border-r border-gray-300 dark:border-slate-700 border-b-0 bg-gray-200 dark:bg-slate-700! text-center w-10">
												<Input
													ref={headerCheckboxRef}
													type="checkbox"
													className="form-checkbox w-4.5 h-4.5 border-stone-300 dark:border-gray-400 ml-2"
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
												className={`text-left px-4 py-2 border-b-0 dark:border-dark font-bold ${textSizeClasses.base} bg-gray-200 dark:bg-slate-700`}
												style={{ width: columnWidths[String(col.key)] ?? 'auto' }}
												onClick={() => col.sortable && handleSort(col.key)}
											>
												<div className="flex items-center">
													<span>{col.header}</span>
													{col.sortable && (
														<span className="ml-2 text-xs text-muted-foreground transition-opacity">
															{sortKey === col.key ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
														</span>
													)}
												</div>
												<span className={columnResizer} />
											</th>
										))}
									</tr>
									{/* filter row */}
									<tr className={dynamicTheadFilterRow}>
										{rowSelection?.enabled && <td className="truncate border-r border-border bg-muted" />}
										{rowExpandable?.enabled && <td className="truncate border-r border-border bg-muted" />}
										{flatColumns.filter(col => visibleColumns[String(col.key)]).map((col) => (
											<td key={String(col.key)} className={`px-1 py-0 border-b border-border bg-muted truncate`}>
												{col.filter === 'input' && (
													<Input
														type="text"
														className={dynamicFilterCellInput}
														placeholder={`Search ${col.header}`}
														onChange={e => {
															const value = e.target.value;
															setCurrentPage(1); // reset pagination to first page
															setColumnFilters(prev => ({
																...prev,
																[col.key]: value
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
														{(() => {
															const [selectSearch, setSelectSearch] = useState('');

															const allOptions = col.filterParams?.options ??
																(() => {
																	const key = String(col.key);
																	let scoped = [...data];
																	if (chainedFilters && chainedFilters.includes(key)) {
																		const currentIndex = chainedFilters.indexOf(key);
																		for (let i = 0; i < currentIndex; i++) {
																			const upstreamKey = chainedFilters[i];
																			const filterVal = columnFilters[upstreamKey];
																			if (filterVal) {
																				const upstreamCol = flatColumns.find(c => String(c.key) === upstreamKey);
																				scoped = scoped.filter(row => {
																					const compareVal = upstreamCol
																						? getCellComparableValue(row, upstreamCol as ColumnDef<T>)
																						: String((row as any)[upstreamKey] ?? '');
																					return compareVal === String(filterVal);
																				});
																			}
																		}
																	}
																	// Build options from the same comparable string we use to filter
																	return Array.from(new Set(
																		scoped
																			.map(row => getCellComparableValue(row, col))
																			.filter(Boolean)
																	));
																})();

															const filteredOptions = selectSearch
																? allOptions.filter(opt =>
																	String(col.filterParams?.labelMap?.[String(opt)] ?? opt)
																		.toLowerCase()
																		.includes(selectSearch.toLowerCase())
																)
																: allOptions;

															return (
																<Select
																	value={String(columnFilters[col.key as string] ?? "__all__")}
																	onValueChange={val => {
																		setColumnFilters(prev => {
																			const key = String(col.key);
																			const current = prev[key];
																			if (val === "__all__") {
																				if (current === undefined) return prev;
																				const updated = { ...prev };
																				delete updated[key];
																				return updated;
																			}
																			if (current === val) return prev;
																			const updated = { ...prev };
																			updated[key] = val;
																			return updated;
																		});
																	}}
																>
																	<SelectTrigger className={dynamicFilterCellSelect}>
																		<SelectValue placeholder={`All`} />
																	</SelectTrigger>
																	<SelectContent
																		searchable
																		searchPlaceholder={`Search ${col.header}...`}
																		onSearchChange={setSelectSearch}
																	>
																		<SelectItem key="__all__" value="__all__">All</SelectItem>
																		{filteredOptions.map(opt => (
																			<SelectItem key={String(opt) || "__invalid__"} value={String(opt) || "__invalid__"}>
																				{String(col.filterParams?.labelMap?.[String(opt) || "__invalid__"] ?? opt)}
																			</SelectItem>
																		))}
																	</SelectContent>
																</Select>
															);
														})()}
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
																		className="absolute z-50 bg-popover text-popover-foreground border border-border mt-1 w-full min-w-[400px] rounded-xs shadow-xl text-xs"
																		style={{
																			position: 'absolute',
																			top: dropdownPosition?.top ?? 0,
																			left: dropdownPosition?.left ?? 0,
																			width: Math.max(buttonRef.current?.offsetWidth ?? 0, 260),
																		}}
																	>
																		<Input
																			type="text"
																			placeholder="Type to filter..."
																			className="w-full form-input bg-background max-w-full px-2 py-1 border-b border-border rounded-xs text-xs sticky top-0 truncate text-foreground placeholder:text-muted-foreground"
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
																					<label key={String(opt)} className="flex items-center gap-1 text-xs px-2 py-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-amber-600">
																						<Input
																							type="checkbox"
																							value={String(opt)}
																							className="form-checkbox w-4 h-4 border-stone-300 dark:border-gray-400"
																							checked={Array.isArray(columnFilters[col.key as string]) && (columnFilters[col.key as string] as string[]).includes(String(opt))}
																							onChange={e => {
																								setColumnFilters(prev => {
																									const existing = Array.isArray(prev[col.key as string]) ? prev[col.key as string] as string[] : [];
																									const updated = e.target.checked
																										? [...existing, String(opt)]
																										: existing.filter((v: string) => v !== String(opt));
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
																	className={dynamicFilterCellSelect}
																>
																	Select multiple
																</button>
																{dropdown}
															</div>
														);
													})()
												)}
												{col.filter === 'date' && (() => {
													const filterKey = String(col.key);
													const currentValue = columnFilters[filterKey];
													const inputValue = Array.isArray(currentValue)
														? (currentValue[0] ?? '')
														: (currentValue ?? '');
													return (
														<Input
															type="date"
															className={dynamicFilterCellDate}
															value={typeof inputValue === 'string' ? inputValue : ''}
															onChange={(e) => updateDateFilter(filterKey, e.target.value || null)}
														/>
													);
												})()}
												{col.filter === 'dateRange' && (() => {
													const filterKey = String(col.key);
													const currentValue = columnFilters[filterKey];
													const rangeValues = Array.isArray(currentValue)
														? currentValue.filter(Boolean).map(v => String(v))
														: typeof currentValue === 'string'
															? currentValue.split(/\s+to\s+/i).filter(Boolean)
															: [];
													return (
														<div className="flex gap-1">
															<Input
																type="date"
																className={dynamicFilterCellDate}
																value={rangeValues[0] ?? ''}
																onChange={(e) => {
																	const next = [...rangeValues];
                                                                    next[0] = e.target.value || '';
																	updateDateRangeFilter(filterKey, next.filter(Boolean));
																}}
															/>
															<Input
																type="date"
																className={dynamicFilterCellDate}
																value={rangeValues[1] ?? ''}
																onChange={(e) => {
																	const next = [...rangeValues];
                                                                    next[1] = e.target.value || '';
																	updateDateRangeFilter(filterKey, next.filter(Boolean));
																}}
															/>
														</div>
													);
												})()}
											</td>
										))}
									</tr>
								</thead>
								<tbody>
                                {pagedData.length === 0 && (
                                    <tr>
                                        {rowSelection?.enabled && (
                                            <td className={`px-3 py-1 ${checkboxCell} border-t border-r`} />
                                        )}
                                        {rowExpandable?.enabled && (
                                            <td className={`px-3 py-1 ${expandCellCollapsed}`} />
                                        )}
                                        <td
                                            colSpan={flatColumns.filter(col => visibleColumns[String(col.key)]).length}
                                            className="px-4 py-6 text-center text-muted-foreground border-b border-border"
                                        >
                                            No data
                                        </td>
                                    </tr>
                                )}
									{pagedData.map((row, i) => {
										const key = resolveRowKey(row, i);
										const displayIndex = (paginationEnabled ? (currentPage - 1) * pageSize : 0) + i + 1;
										return (
                                            <React.Fragment key={key}>
                                                <tr
													className={
														`px-3 py-2 ${rowClass?.(row) ?? 'even:bg-gray-50 dark:even:bg-slate-700 dark:odd:bg-slate-800'}`
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
															className={`px-3 py-1 ${checkboxCell} ${expandedRows.has(key as number) ? 'border-t' : ''} border-t border-r dark:border-r-0 ${i % 2 === 0 ? 'even:bg-gray-50 dark:even:bg-slate-700 dark:odd:bg-slate-800' : ''}`}
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
																`px-3 py-1 ` +
																(expandedRows.has(key as number)
																	? expandCellExpanded
																	: expandCellCollapsed)
															}
														>
															<FontAwesomeIcon icon={expandedRows.has(key as number) ? faMinus : faPlus} className={`${expandedRows.has(key as number) ? 'text-red-600 dark:text-red-800' : 'text-green-600 dark:text-green-700'}`} onClick={() => {
																const newExpanded = new Set(expandedRows);
																if (newExpanded.has(key as number)) newExpanded.delete(key as number);
																else newExpanded.add(key as number);
																setExpandedRows(newExpanded);
															}} />
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
																className={`px-4 border-b ${expandedRows.has(key as number) ? expandedCellBorder : defaultCellBorder} break-words px-3 py-1 ${col.colClass ?? ''} ${col.colClassParams?.(row) ?? ''} ${highlightClass}`}
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
																<span className={textSizeClasses.base}>
																	{col.render ? col.render(row, displayIndex) : String(row[col.key as keyof typeof row] ?? '')}
																</span>
															</td>
														);
													})}
												</tr>
                                                {rowExpandable?.enabled && expandedRows.has(key as number) && (
													<tr>
														{rowSelection?.enabled && (
															<td
																className={`px-3 py-2 ${expandedRowLeft}`}
															/>
														)}
														<td
															className={`px-3 py-2 ${expandedRowLeftSpacer}`}
														>
														</td>
														<td
															colSpan={flatColumns.filter(col => visibleColumns[String(col.key)]).length}
															className={`${expandedRowContent.replace(/dark:border-dark/g, '')} px-3 py-2`}
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
				</div>
				{!paginationEnabled && (
					<div className="flex items-center justify-between p-2 text-sm border-t bg-gray-100 dark:bg-slate-800 dark:border-dark">
						<div>Total entries: {sortedData.length}</div>
						<div>
							{rowSelection?.enabled && `Selected: ${selectedRowKeys.size}`}
						</div>
					</div>
				)}
			</div>
            {paginationEnabled && (
				<div className={paginationContainer}>
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
						<div className="flex w-full items-end gap-2">
							<label htmlFor="pageSize" className={`${textSizeClasses.small} max-w-[100px] text-muted-foreground font-normal`}>Page size:</label>
							<Select
								value={String(pageSize)}
								onValueChange={(val) => {
									setCurrentPage(1);
									setPageSize(Number(val));
								}}
							>
								<SelectTrigger className={`form-select form-select-sm max-w-[100px] px-1 rounded-xs bg-background truncate text-foreground focus:outline-hidden ${textSizeClasses.small}`}>
									<SelectValue placeholder="Page size" />
								</SelectTrigger>
								<SelectContent searchable searchPlaceholder="Search page size...">
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
										className={dynamicPaginationButton}
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
												className={`${dynamicPaginationButton} ${currentPage === page ? dynamicPaginationButtonActive : ''}`}
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
											className={`${dynamicPaginationButton} ${currentPage === 1 ? dynamicPaginationButtonActive : ''}`}
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
													className={`${dynamicPaginationButton} ${currentPage === page ? dynamicPaginationButtonActive : ''}`}
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
											className={`${dynamicPaginationButton} ${currentPage === totalPages ? dynamicPaginationButtonActive : ''}`}
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
										className={dynamicPaginationButton}
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
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm text-muted-foreground gap-2">
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
) => React.ReactElement<any>;
