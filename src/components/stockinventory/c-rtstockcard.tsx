'use client'

import React, { useState, useEffect } from 'react';
import { CustomDataGrid } from '@components/ui/DataGrid';
import { authenticatedApi } from '@/config/api';

interface StockTransaction {
    id: number;
    itemId: number;
    date: string;
    type: 'in' | 'out';
    quantity: number;
    balance: number;
    note?: string;
}

interface CartItem {
    id: number;
    item_id: number;
    item_code: string;
    item_name: string;
    total_in: number;
    total_out: number;
    balance: number;
    data_issue?: any;
    image?: string;
    category?: string;
    sku?: string;
    location?: string;
}

const CCard: React.FC = () => {
    const [search, setSearch] = useState('');
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        authenticatedApi.get('/api/stock/cards')
            .then(res => {
                const items = Array.isArray((res as any).data?.data) ? (res as any).data.data : [];
                setCartItems(items);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    // Helper to build summary rows from API data
    const getSummaryRows = () => {
        return cartItems.map(item => ({
            id: item.id,
            item_code: item.item_code,
            item_name: item.item_name,
            inQty: item.total_in,
            outQty: item.total_out,
            balanceApp: item.total_in - item.total_out,
            balancePhysical: item.balance
        }));
    };

    const summaryRows = getSummaryRows();
    const filteredRows = summaryRows.filter(row =>
        row.item_name.toLowerCase().includes(search.toLowerCase()) ||
        String(row.id).includes(search) ||
        (row.item_code && row.item_code.toLowerCase().includes(search.toLowerCase()))
    );

    const columns = [
        { key: 'id', header: 'ID' },
        { key: 'item_code', header: 'Item Code' },
        {
            key: 'item_name',
            header: 'Item Name',
            sortable: true,
            render: (row: typeof filteredRows[0]) => (
                <span>{row.item_name}</span>
            ),
        },
        { key: 'inQty', header: 'In', sortable: true },
        { key: 'outQty', header: 'Out', sortable: true },
        { key: 'balanceApp', header: 'Balance (App)', sortable: true },
        { key: 'balancePhysical', header: 'Balance (Physical)', sortable: true },
    ] as const;

    // Add row double click handler to navigate to detail-stock page
    const handleRowDoubleClick = (row: any) => {
        // Assuming you have a route like /stockinventory/detail-stock/[item_id]
        window.open(`/stock/data/sc/${row.id}`, '_blank');
    };

    if (loading) {
        return <div className="text-gray-500 text-center py-10">Loading...</div>;
    }
    if (error) {
        return <div className="text-red-500 text-center py-10">{error}</div>;
    }

    return (
        <div className="w-full mt-4">
            <div className="dark:bg-neutral-900 rounded-lg w-full relative mx-auto">
                <div className="overflow-x-auto">
                    <CustomDataGrid
                        columns={columns as any}
                        data={filteredRows}
                        onRowDoubleClick={handleRowDoubleClick}
                    />
                </div>
            </div>
        </div>
    );
};

export default CCard;
