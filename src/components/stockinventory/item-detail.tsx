import React from 'react';
import CCard from './c-card';
import itemTransactionData from './itemTransaction.json';

interface Review {
    id: number;
    user: string;
    rating: number;
    comment: string;
}

interface CartItem {
    id: number;
    name: string;
    stock: number;
    image: string;
    category: string;
    sku: string;
    location: string;
}

interface ItemDetailProps {
    item: CartItem;
    reviews?: Review[];
    onClose: () => void;
}

const ItemDetail: React.FC<ItemDetailProps> = ({ item, reviews = [], onClose }) => {
    // Get transactions for this item
    const transactions = Array.isArray(itemTransactionData)
        ? itemTransactionData.filter((t: any) => t.itemId === item.id)
        : [];
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-200 bg-opacity-40">
            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg p-6 w-full max-w-4xl relative flex flex-col md:flex-row gap-8">
                <button
                    className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl"
                    onClick={onClose}
                    aria-label="Close"
                >
                    &times;
                </button>
                {/* Item Details */}
                <div className="flex-1 flex flex-col items-center md:items-start">
                    <img src={item.image} alt={item.name} className="w-32 h-32 object-contain mb-4 rounded" />
                    <h2 className="font-bold text-2xl mb-2">{item.name}</h2>
                    <div className="text-sm text-gray-500 mb-1">SKU: {item.sku}</div>
                    <div className="text-sm text-gray-500 mb-1">Category: {item.category}</div>
                    <div className="text-sm text-gray-500 mb-1">Location: {item.location}</div>
                    <div className={`font-bold mb-2 ${item.stock === 0 ? 'text-red-500' : 'text-green-600'}`}>Stock: {item.stock}</div>
                    <div className="mt-6 w-full">
                        <h3 className="font-semibold text-lg mb-2">User Reviews</h3>
                        {reviews.length === 0 ? (
                            <div className="text-gray-400 text-sm">No reviews yet.</div>
                        ) : (
                            <ul className="space-y-3 max-h-40 overflow-y-auto">
                                {reviews.map(review => (
                                    <li key={review.id} className="border-b pb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-blue-600">{review.user}</span>
                                            <span className="text-yellow-500">{'★'.repeat(review.rating)}</span>
                                        </div>
                                        <div className="text-sm text-gray-700 dark:text-gray-300">{review.comment}</div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
                {/* Stock Transactions */}
                <div className="flex-2 w-full">
                    <h3 className="font-semibold text-lg mb-2">Stock Transactions</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm border">
                            <thead>
                                <tr className="bg-gray-100 dark:bg-neutral-800">
                                    <th className="px-2 py-1 border">Date</th>
                                    <th className="px-2 py-1 border">Type</th>
                                    <th className="px-2 py-1 border">Qty</th>
                                    <th className="px-2 py-1 border">Balance</th>
                                    <th className="px-2 py-1 border">Note</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-4 text-gray-400">No transactions found.</td>
                                    </tr>
                                ) : (
                                    transactions.map((tx: any) => (
                                        <tr key={tx.id}>
                                            <td className="border px-2 py-1">{tx.date}</td>
                                            <td className="border px-2 py-1 capitalize">{tx.type}</td>
                                            <td className="border px-2 py-1">{tx.quantity}</td>
                                            <td className="border px-2 py-1">{tx.balance}</td>
                                            <td className="border px-2 py-1">{tx.note || '-'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ItemDetail;
