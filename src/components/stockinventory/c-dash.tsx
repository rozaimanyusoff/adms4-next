import React from 'react';
import cartItemsData from './cartItems.json';
import itemTransactionData from './itemTransaction.json';

// Types
interface CartItem {
    id: number;
    name: string;
    stock: number;
    image: string;
    category: string;
    sku: string;
    location: string;
}

interface StockTransaction {
    id: number;
    itemId: number;
    date: string;
    type: 'in' | 'out';
    quantity: number;
    balance: number;
    note?: string;
}

const cartItems: CartItem[] = Array.isArray(cartItemsData) ? cartItemsData : [];
const transactions: StockTransaction[] = Array.isArray(itemTransactionData)
    ? itemTransactionData.map(t => ({
        ...t,
        type: t.type === 'in' ? 'in' : 'out',
    }))
    : [];

// Metrics
const totalItems = cartItems.length;
const totalStock = cartItems.reduce((sum, item) => sum + item.stock, 0);
const totalStockIn = transactions.filter(t => t.type === 'in').reduce((sum, t) => sum + t.quantity, 0);
const totalStockOut = transactions.filter(t => t.type === 'out').reduce((sum, t) => sum + t.quantity, 0);
const lowStockItems = cartItems.filter(item => item.stock <= 5);
const numLowStock = lowStockItems.length;
const numCompleted = transactions.filter(t => t.note?.toLowerCase() === 'completed').length;
const numPending = transactions.filter(t => t.note?.toLowerCase() === 'pending').length;

// Helper for random bg color
const widgetBgColors = [
    'bg-blue-100 dark:bg-blue-900',
    'bg-green-100 dark:bg-green-900',
    'bg-yellow-100 dark:bg-yellow-900',
    'bg-red-100 dark:bg-red-900',
    'bg-purple-100 dark:bg-purple-900',
    'bg-pink-100 dark:bg-pink-900',
    'bg-orange-100 dark:bg-orange-900',
    'bg-cyan-100 dark:bg-cyan-900',
    'bg-teal-100 dark:bg-teal-900',
];
function getRandomBg(idx: number) {
    return widgetBgColors[idx % widgetBgColors.length];
}

const CDash: React.FC = () => (
    <div className="w-full max-w-5xl mx-auto">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className={`rounded shadow-lg p-4 text-center ${getRandomBg(0)}`}>
                <div className="text-lg font-semibold">Total Products</div>
                <div className="text-3xl font-bold text-blue-600">{totalItems}</div>
            </div>
            <div className={`rounded shadow-lg p-4 text-center ${getRandomBg(1)}`}>
                <div className="text-lg font-semibold">Total Stock</div>
                <div className="text-3xl font-bold text-green-600">{totalStock}</div>
            </div>
            <div className={`rounded shadow-lg p-4 text-center ${getRandomBg(2)}`}>
                <div className="text-lg font-semibold">Stock In</div>
                <div className="text-3xl font-bold text-primary">{totalStockIn}</div>
            </div>
            <div className={`rounded shadow-lg p-4 text-center ${getRandomBg(3)}`}>
                <div className="text-lg font-semibold">Stock Out</div>
                <div className="text-3xl font-bold text-red-500">{totalStockOut}</div>
            </div>
        </div>
        {/* Widgets Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className={`rounded shadow-lg p-4 text-center ${getRandomBg(4)}`}>
                <div className="text-lg font-semibold">Items with Low Stock</div>
                <div className="text-3xl font-bold text-orange-500">{numLowStock}</div>
            </div>
            <div className={`rounded shadow-lg p-4 text-center ${getRandomBg(5)}`}>
                <div className="text-lg font-semibold">Transactions Completed</div>
                <div className="text-3xl font-bold text-green-600">{numCompleted}</div>
            </div>
            <div className={`rounded shadow-lg p-4 text-center ${getRandomBg(6)}`}>
                <div className="text-lg font-semibold">Transactions Pending</div>
                <div className="text-3xl font-bold text-yellow-500">{numPending}</div>
            </div>
        </div>
    </div>
);

export default CDash;
