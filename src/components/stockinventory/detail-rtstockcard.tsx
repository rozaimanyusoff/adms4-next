'use client';
import React, { useEffect, useState } from "react";
import { CustomDataGrid } from "@components/ui/DataGrid";
import { authenticatedApi } from "@/config/api";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface StockTransaction {
    id: number;
    item_id: number;
    date: string;
    type: 'in' | 'out';
    quantity: number;
    balance: number;
    note?: string;
}

interface Props {
    id: string;
}

const DetailRTStockCard: React.FC<Props> = ({ id }) => {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [items, setItems] = useState<any[]>([]); // For navigation/search
    const [currentIdx, setCurrentIdx] = useState<number>(-1);
    const [searchValue, setSearchValue] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [activeCard, setActiveCard] = useState<number | null>(null);

    // Fetch all items for navigation/search
    useEffect(() => {
        authenticatedApi.get('/api/stock/cards')
            .then(res => {
                const arr = Array.isArray((res as any).data?.data) ? (res as any).data.data : [];
                setItems(arr);
                const idx = arr.findIndex((i: any) => String(i.id) === String(id));
                setCurrentIdx(idx);
            });
    }, [id]);

    // Fetch transactions for current item
    useEffect(() => {
        setLoading(true);
        setError(null);
        const itemId = items.length > 0 && currentIdx >= 0 ? items[currentIdx].id : id;
        authenticatedApi.get(`/api/stock/items/${itemId}/transactions`)
            .then(res => {
                const items = Array.isArray((res as any).data?.data) ? (res as any).data.data : [];
                setTransactions(items);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, [id, items, currentIdx]);

    // Autocomplete search for item_code or item_name
    useEffect(() => {
        if (searchValue.length < 2) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }
        const results = items.filter((item: any) => {
            const codeMatch = item.item_code && item.item_code.toLowerCase().includes(searchValue.toLowerCase());
            const nameMatch = item.item_name && item.item_name.toLowerCase().includes(searchValue.toLowerCase());
            return codeMatch || nameMatch;
        });
        setSearchResults(results);
        setShowDropdown(results.length > 0);
    }, [searchValue, items]);

    // Summary calculation
    const totalIssued = transactions.filter((t: any) => t.status && t.status.toLowerCase() === 'issued').length;
    const inStock = transactions.filter((t: any) => t.status && t.status.toLowerCase() === 'in_stock').length;
    const issuedButUnused = transactions.filter((t: any) => t.status && t.status.toLowerCase() === 'issued' && (!t.installed_location || t.installed_location.trim() === "")).length;
    const noSerial = transactions.filter((t: any) => !t.serial_no || t.serial_no === "").length;

    // Helper: group issued by department-team
    const issuedByDeptTeam: Record<string, { dept: string, team: string, qty: number }> = {};
    transactions.forEach((t: any) => {
        if (t.status && t.status.toLowerCase() === 'issued') {
            const dept = t.department || '-';
            const team = t.team_name || '-';
            const key = dept + '|' + team;
            if (!issuedByDeptTeam[key]) {
                issuedByDeptTeam[key] = { dept, team, qty: 0 };
            }
            issuedByDeptTeam[key].qty += 1;
        }
    });
    const issuedDeptTeamArr = Object.values(issuedByDeptTeam);

    // Helper: group issued but unused by department-team
    const issuedUnusedByDeptTeam: Record<string, { dept: string, team: string, qty: number }> = {};
    transactions.forEach((t: any) => {
        if (t.status && t.status.toLowerCase() === 'issued' && (!t.installed_location || t.installed_location.trim() === "")) {
            const dept = t.department || '-';
            const team = t.team_name || '-';
            const key = dept + '|' + team;
            if (!issuedUnusedByDeptTeam[key]) {
                issuedUnusedByDeptTeam[key] = { dept, team, qty: 0 };
            }
            issuedUnusedByDeptTeam[key].qty += 1;
        }
    });
    const issuedUnusedDeptTeamArr = Object.values(issuedUnusedByDeptTeam);

    // Updated columns to match the new transaction data fields
    const columns = [
        { key: 'id', header: 'ID' },
        { key: 'item_code', header: 'Item Code' },
        { key: 'item_name', header: 'Item Name' },
        { key: 'serial_no', header: 'Serial No' },
        { key: 'store', header: 'Store' },
        { key: 'department', header: 'Department' },
        { key: 'team_name', header: 'Team' },
        { key: 'status', header: 'Status', render: (row: any) => row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1) : '-' },
        { key: 'delivery_date', header: 'Delivery Date', render: (row: any) => row.delivery_date ? new Date(row.delivery_date).toLocaleDateString() : '-' },
        { key: 'issue_date', header: 'Issue Date', render: (row: any) => row.issue_date ? new Date(row.issue_date).toLocaleDateString() : '-' },
        { key: 'issue_no', header: 'Issue No' },
        { key: 'installed_location', header: 'Installed Location' },
        { key: 'registered_by', header: 'Registered By' },
        { key: 'updated_by', header: 'Updated By' },
        { key: 'created_at', header: 'Created At', render: (row: any) => row.created_at ? new Date(row.created_at).toLocaleString() : '-' },
        { key: 'updated_at', header: 'Updated At', render: (row: any) => row.updated_at ? new Date(row.updated_at).toLocaleString() : '-' },
        { key: 'is_duplicate', header: 'Duplicate', render: (row: any) => row.is_duplicate ? 'Yes' : 'No' },
    ];

    const cardColors = [
        "bg-blue-600", "bg-green-600", "bg-amber-500", "bg-red-500", "bg-purple-600", "bg-pink-600", "bg-cyan-600", "bg-orange-500"
    ];

    const summaryCards = [
        {
            label: "Total Issued",
            value: totalIssued,
            color: "bg-blue-600",
            filter: (t: any) => t.status && t.status.toLowerCase() === 'issued',
        },
        {
            label: "In Stock",
            value: inStock,
            color: "bg-green-600",
            filter: (t: any) => t.status && t.status.toLowerCase() === 'in_stock',
        },
        {
            label: "Issued but Unused",
            value: issuedButUnused,
            color: "bg-yellow-500",
            filter: (t: any) => t.status && t.status.toLowerCase() === 'issued' && (!t.installed_location || t.installed_location.trim() === ""),
        },
        {
            label: "No Serial Number",
            value: noSerial,
            color: "bg-red-600",
            filter: (t: any) => !t.serial_no || t.serial_no === "",
        },
    ];

    // Filtered transactions for grid
    const filteredTransactions = activeCard === null
        ? transactions
        : transactions.filter(summaryCards[activeCard].filter);

    if (loading) {
        return <div className="text-gray-500 text-center py-10">Loading transactions...</div>;
    }
    if (error) {
        return <div className="text-red-500 text-center py-10">{error}</div>;
    }

    return (
        <div className="w-full">

            {/* Navbar */}
            <div className="flex items-center justify-between bg-gradient-to-b from-gray-200 to-gray-100 rounded shadow px-4 py-3 mb-6">
                <div className="flex items-center gap-4">
                    <span className="text-lg font-semibold">Stock Card Detail</span>
                    {items && currentIdx >= 0 && items[currentIdx]?.item_name && (
                        <span className="ml-2 text-base text-gray-600 font-normal">{items[currentIdx].item_name}</span>
                    )}
                </div>
                <div className="flex items-center gap-2 relative">
                    <div className="w-64 relative">
                        <Input
                            type="text"
                            placeholder="Search item code or name..."
                            className="w-64"
                            value={searchValue}
                            onChange={e => setSearchValue(e.target.value)}
                            onFocus={() => setShowDropdown(searchResults.length > 0)}
                            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                        />
                        {showDropdown && (
                            <ul className="absolute z-10 w-full bg-stone-200 border border-gray-200 rounded shadow-lg max-h-48 overflow-auto mt-1">
                                {searchResults.map((item) => (
                                    <li
                                        key={item.id}
                                        className="px-3 py-2 hover:bg-blue-100 cursor-pointer text-sm"
                                        onMouseDown={() => {
                                            setCurrentIdx(items.findIndex((i: any) => i.id === item.id));
                                            setSearchValue("");
                                            setShowDropdown(false);
                                        }}
                                    >
                                        <div className="font-medium">{item.item_code}</div>
                                        <div className="text-xs text-gray-500">{item.item_name}</div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-full border border-gray-300 dark:border-neutral-700"
                        onClick={() => {
                            if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
                        }}
                        disabled={currentIdx <= 0}
                        title="Previous Item"
                    >
                        <ChevronLeft size={20} />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-full border border-gray-300 dark:border-neutral-700"
                        onClick={() => {
                            if (currentIdx >= 0 && currentIdx < items.length - 1) setCurrentIdx(currentIdx + 1);
                        }}
                        disabled={currentIdx === -1 || currentIdx === items.length - 1}
                        title="Next Item"
                    >
                        <ChevronRight size={20} />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-full bg-red-500 hover:bg-red-600 text-white dark:border-neutral-700"
                        title="Close"
                        onClick={() => window.close()}
                    >
                        <span className="sr-only">Close</span>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </Button>
                </div>
            </div>
            {/* Main Content */}
            <div className="w-full px-4">
                <div className="bg-transparent">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        {summaryCards.map((card, idx) => (
                            <Card
                                key={card.label}
                                className={`w-full cursor-pointer flex flex-col items-center p-4 shadow-lg transition-transform duration-150 hover:scale-105 border-0 ${cardColors[idx % cardColors.length]} text-white ${activeCard === idx ? 'ring-2 -ring-offset-1 ring-purple-500' : ''}`}
                                onClick={() => setActiveCard(activeCard === idx ? null : idx)}
                            >
                                <span className="opacity-80 font-bold text-white">{card.label}</span>
                                <span className="text-3xl font-bold">{card.value}</span>
                                {card.label === 'Total Issued' && (
                                    <div className="w-full text-xs text-white space-y-1">
                                        {issuedDeptTeamArr.map((row) => (
                                            <div key={row.dept + row.team} className="flex justify-between w-full">
                                                <span>{row.dept} - {row.team}</span>
                                                <span className="font-semibold">{row.qty}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {card.label === 'Issued but Unused' && (
                                    <div className="w-full text-xs text-white space-y-1">
                                        {issuedUnusedDeptTeamArr.map((row) => (
                                            <div key={row.dept + row.team} className="flex justify-between w-full">
                                                <span>{row.dept} - {row.team}</span>
                                                <span className="font-semibold">{row.qty}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                    <div className="dark:bg-neutral-900 rounded-lg w-full relative mx-auto">
                        <div className="overflow-x-auto">
                            <CustomDataGrid columns={columns as any} data={filteredTransactions} inputFilter={false} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DetailRTStockCard;
