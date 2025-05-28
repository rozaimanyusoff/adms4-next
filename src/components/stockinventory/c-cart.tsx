'use client';
import React, { useState } from 'react';
import cartItemsData from './cartItems.json';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShoppingCart } from '@fortawesome/free-solid-svg-icons';
import ItemDetail from './item-detail';

// Type for cart item
interface CartItem {
    id: number;
    name: string;
    stock: number;
    image: string;
    category: string;
    sku: string;
    location: string;
}

const cartItems: CartItem[] = Array.isArray(cartItemsData) ? cartItemsData : [];

const categories = ['All', ...Array.from(new Set(cartItems.map((item: CartItem) => item.category)))] as string[];

const getLocationOptions = (items: CartItem[]) => {
    const locations = Array.from(new Set(items.map(item => item.location)));
    return ['All', ...locations];
};

const ITEMS_PER_PAGE = 12;

const CCart = () => {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedLocation, setSelectedLocation] = useState('All');
    const [stockRange, setStockRange] = useState<[number, number]>([0, 100]);
    const [page, setPage] = useState(1);
    // Track selected items and their quantities
    const [selectedItems, setSelectedItems] = useState<Record<number, number>>({});
    const [selectedItem, setSelectedItem] = useState<CartItem | null>(null);

    const locationOptions = getLocationOptions(cartItems);
    const minStock = 0;
    const maxStock = Math.max(...cartItems.map(item => item.stock), 100);

    const filteredItems = cartItems.filter((item: CartItem) => {
        const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
        const matchesLocation = selectedLocation === 'All' || item.location === selectedLocation;
        const matchesStock = item.stock >= stockRange[0] && item.stock <= stockRange[1];
        const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
        return matchesCategory && matchesLocation && matchesStock && matchesSearch;
    });

    const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
    const paginatedItems = filteredItems.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    // Total items
    const totalItems = cartItems.length;
    // Total items by location
    const itemsByLocation = cartItems.reduce((acc, item) => {
        acc[item.location] = (acc[item.location] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Add to cart handler
    const handleAddToCart = (itemId: number) => {
        setSelectedItems(prev => ({
            ...prev,
            [itemId]: (prev[itemId] || 0) + 1
        }));
    };
    const cartCount = Object.values(selectedItems).reduce((sum, qty) => sum + qty, 0);

    // Show action buttons below cart icon if there are items in cart
    const showCartActions = cartCount > 0;

    // Handler for Add to Request navigation
    const handleAddToRequest = () => {
        // Save selected items to localStorage before navigating
        localStorage.setItem('stockout_selected_items', JSON.stringify(
            Object.entries(selectedItems).map(([id, qty]) => {
                const item = cartItems.find(i => i.id === Number(id));
                return item ? { ...item, qty } : null;
            }).filter(Boolean)
        ));
        window.location.href = '/stock/outapp?create=1';
    };

    return (
        <div className="flex min-h-[80vh] h-full gap-4">
            {/* Left Pane: Filters */}
            <aside className="w-56 flex-shrink-0 bg-white dark:bg-neutral-900 rounded-sm p-4 shadow-sm flex flex-col gap-4">
                <div className="flex flex-col items-end gap-2 mb-2">
                    <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faShoppingCart} className="text-blue-600" size='xl' />
                        <span className="text-blue-600 font-semibold">{cartCount} Selected</span>
                    </div>
                    {showCartActions && (
                        <div className="flex flex-col w-full gap-2 mt-2">
                            <button
                                className="w-full px-3 py-2 rounded bg-primary text-white hover:bg-primary-dark transition"
                                onClick={handleAddToRequest}
                            >
                                Add to Request
                            </button>
                            <button className="w-full px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition">Update Inventory</button>
                        </div>
                    )}
                </div>
                <h2 className="font-bold text-lg mb-2">Filter</h2>
                <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select
                        className="w-full rounded border border-gray-300 dark:border-neutral-700 p-2 bg-white dark:bg-neutral-800 mb-1"
                        value={selectedCategory}
                        onChange={e => { setSelectedCategory(e.target.value); setPage(1); }}
                    >
                        {categories.map((cat: string) => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    <div className="text-xs text-blue-600 font-semibold mb-2">Total Items: {filteredItems.length}</div>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Location</label>
                    <select
                        className="w-full rounded border border-gray-300 dark:border-neutral-700 p-2 bg-white dark:bg-neutral-800 mb-1"
                        value={selectedLocation}
                        onChange={e => { setSelectedLocation(e.target.value); setPage(1); }}
                    >
                        {locationOptions.map(loc => (
                            <option key={loc} value={loc}>{loc}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Stock Range</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min={minStock}
                            max={stockRange[1]}
                            value={stockRange[0]}
                            onChange={e => {
                                const val = Math.min(Number(e.target.value), stockRange[1]);
                                setStockRange([val, stockRange[1]]);
                                setPage(1);
                            }}
                            className="w-14 rounded border border-gray-300 dark:border-neutral-700 p-1 bg-white dark:bg-neutral-800 text-xs"
                        />
                        <span>-</span>
                        <input
                            type="number"
                            min={stockRange[0]}
                            max={maxStock}
                            value={stockRange[1]}
                            onChange={e => {
                                const val = Math.max(Number(e.target.value), stockRange[0]);
                                setStockRange([stockRange[0], val]);
                                setPage(1);
                            }}
                            className="w-14 rounded border border-gray-300 dark:border-neutral-700 p-1 bg-white dark:bg-neutral-800 text-xs"
                        />
                    </div>
                </div>
            </aside>

            {/* Right Pane: Items */}
            <section className="flex-1 flex flex-col">
                {/* Search Bar */}
                <div className="mb-4 flex items-center gap-2">
                    <input
                        type="text"
                        placeholder="Search items..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        className="w-full rounded border border-gray-300 dark:border-neutral-700 p-2 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>
                {/* Items Grid */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                    {paginatedItems.length === 0 && (
                        <div className="col-span-full text-center text-gray-500 py-10">No items found.</div>
                    )}
                    {paginatedItems.map((item: CartItem) => {
                        const isSelected = !!selectedItems[item.id];
                        const qty = selectedItems[item.id] || 0;
                        return (
                            <div
                                key={item.id}
                                className={`bg-white dark:bg-neutral-900 rounded-xl shadow p-4 flex flex-col items-center h-full min-h-[260px] max-h-[340px] transition-all border-2 ${isSelected ? 'inset-ring-2 inset-ring-green-500 border-green-500' : 'border-transparent'} cursor-pointer`}
                                onClick={() => setSelectedItem(item)}
                            >
                                <img src={item.image} alt={item.name} className="w-24 h-24 object-contain mb-3 rounded" />
                                <div className="font-semibold text-lg mb-1">{item.name}</div>
                                <div className="text-xs text-gray-500 mb-1">SKU: {item.sku}</div>
                                <div className="text-xs text-gray-500 mb-1">Location: {item.location}</div>
                                <div className={`font-bold mb-2 ${item.stock === 0 ? 'text-red-500' : 'text-green-600'}`}>Stock: {item.stock}</div>
                                {qty > 0 && <div className="text-xs text-green-600 font-semibold mb-1">Qty: {qty}</div>}
                                <button
                                    className="mt-auto px-4 py-2 rounded bg-primary text-white hover:bg-primary-dark transition disabled:opacity-50"
                                    disabled={item.stock === 0}
                                    onClick={e => { e.stopPropagation(); handleAddToCart(item.id); }}
                                >
                                    Add to Cart
                                </button>
                            </div>
                        );
                    })}
                </div>
                {/* Pagination */}
                <div className="flex justify-center items-center gap-2 mt-6">
                    <button
                        className="px-3 py-1 rounded border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 disabled:opacity-50"
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                    >
                        Prev
                    </button>
                    <span className="px-2 text-sm">Page {page} of {totalPages}</span>
                    <button
                        className="px-3 py-1 rounded border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 disabled:opacity-50"
                        onClick={() => setPage(page + 1)}
                        disabled={page === totalPages}
                    >
                        Next
                    </button>
                </div>
            </section>
            {selectedItem && (
                <ItemDetail
                    item={selectedItem}
                    // reviews={reviewsForSelectedItem} // Placeholder for future reviews data
                    onClose={() => setSelectedItem(null)}
                />
            )}
        </div>
    );
};

export default CCart;
