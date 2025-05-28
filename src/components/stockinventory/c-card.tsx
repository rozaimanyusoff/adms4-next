'use client'

import React, { useState } from 'react';
import cartItemsData from './cartItems.json';
import itemTransactionData from './itemTransaction.json';
import ItemDetail from './item-detail';
import { CustomDataGrid } from '@components/layouts/ui/DataGrid';

const allTransactions: StockTransaction[] = Array.isArray(itemTransactionData)
    ? itemTransactionData.map(t => ({
        ...t,
        type: t.type === 'in' ? 'in' : 'out'
    }))
    : [];

// Optionally, you can get item info from cartItemsData if needed
const cartItems: CartItem[] = Array.isArray(cartItemsData) ? cartItemsData : [];

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
    name: string;
    stock: number;
    image: string;
    category: string;
    sku: string;
    location: string;
    // ...other fields as needed
}

interface CCardProps {
    item?: CartItem;
    transactions: StockTransaction[];
    onClose?: () => void;
}

const getItemName = (itemId: number) => {
    const item = cartItems.find(i => i.id === itemId);
    return item ? item.name : 'Unknown';
};

// Helper to calculate In, Out, Balance (App), Balance (Physical)
const getSummaryRows = () => {
    return cartItems.map(item => {
        const transactions = allTransactions.filter(t => t.itemId === item.id);
        const inQty = transactions.filter(t => t.type === 'in').reduce((sum, t) => sum + t.quantity, 0);
        const outQty = transactions.filter(t => t.type === 'out').reduce((sum, t) => sum + t.quantity, 0);
        const balanceApp = inQty - outQty;
        // For demo, assume physical balance is app balance minus items not yet collected (simulate with 0 for now)
        const balancePhysical = balanceApp; // Replace with real logic if you track pending collections
        return {
            id: item.id,
            name: item.name,
            inQty,
            outQty,
            balanceApp,
            balancePhysical
        };
    });
};

const CCard: React.FC = () => {
    const [search, setSearch] = useState('');
    const [selectedItem, setSelectedItem] = useState<CartItem | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    const summaryRows = getSummaryRows();
    const filteredRows = summaryRows.filter(row =>
        row.name.toLowerCase().includes(search.toLowerCase()) ||
        String(row.id).includes(search)
    );

    const columns = [
        { key: 'id', header: 'ID' },
        {
            key: 'name',
            header: 'Item Name',
            sortable: true,
            render: (row: typeof filteredRows[0]) => (
                <span
                    className="text-blue-600 underline cursor-pointer hover:text-blue-800"
                    onClick={() => {
                        const selected = cartItems.find(i => i.id === row.id);
                        if (selected) {
                            setSelectedItem(selected);
                            setModalOpen(true);
                        }
                    }}
                >
                    {row.name}
                </span>
            ),
        },
        { key: 'inQty', header: 'In', sortable: true },
        { key: 'outQty', header: 'Out', sortable: true },
        { key: 'balanceApp', header: 'Balance (App)', sortable: true },
        { key: 'balancePhysical', header: 'Balance (Physical)', sortable: true },
    ] as const;

    // Show summary table if no item selected
    if (!modalOpen || !selectedItem) {
        return (
            <div className="w-full">
                <div className="dark:bg-neutral-900 rounded-lg w-full relative mx-auto">
                    <div className="overflow-x-auto">
                        <CustomDataGrid columns={columns as any} data={filteredRows} />
                    </div>
                </div>
            </div>
        );
    }

    // Show ItemDetail modal when an item is selected
    return (
        <>
            <ItemDetail
                item={selectedItem}
                onClose={() => {
                    setModalOpen(false);
                    setSelectedItem(null);
                }}
            />
        </>
    );
};

export default CCard;
