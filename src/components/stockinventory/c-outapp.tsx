'use client';
import React, { useState, useEffect } from 'react';
import { CustomDataGrid } from '@components/layouts/ui/DataGrid';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShoppingCart, faPlus, faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import CCart from './c-cart';
import ActionSidebar from '@components/layouts/ui/ActionSidebar';
import { faTh, faList } from '@fortawesome/free-solid-svg-icons';
import SidebarItemPicker from './item-cart';

const columns = [
    { key: 'id', header: 'ID' },
    { key: 'item', header: 'Item' },
    { key: 'quantity', header: 'Quantity' },
    { key: 'status', header: 'Status' },
    { key: 'date', header: 'Date' },
    { key: 'actions', header: 'Actions' },
] as const;

const applications: any[] = []; // Placeholder for application records

const COutApp: React.FC = () => {
    const [showForm, setShowForm] = useState(false);
    const [selectedItems, setSelectedItems] = useState<any[]>([]);

    // Helper to load selected items from localStorage
    const loadSelectedItems = () => {
        if (typeof window !== 'undefined') {
            const items = localStorage.getItem('stockout_selected_items'); // <-- match CCart key
            if (items) {
                try {
                    setSelectedItems(JSON.parse(items));
                } catch {
                    setSelectedItems([]);
                }
            } else {
                setSelectedItems([]);
            }
        }
    };

    // Open form if ?create=1 is in the URL and load selected items
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('create') === '1') {
                setShowForm(true);
                loadSelectedItems();
            }
        }
    }, []);

    // When form is opened via button, also load selected items
    const handleShowForm = () => {
        // Close the sidebar when the form is toggled to visible
        if (!showForm) {
            const closeEvent = new CustomEvent('closeSidebar');
            window.dispatchEvent(closeEvent);
        }
        setShowForm(v => {
            const next = !v;
            if (next) loadSelectedItems();
            return next;
        });
    };

    const handleCartClick = () => {
        // Redirect to stock request form
        setShowForm(true);
    };

    // State for adding new item
    const [addItemId, setAddItemId] = useState('');
    const [addItemQty, setAddItemQty] = useState(1);

    // Get all available items (simulate from cartItems.json)
    // In real app, fetch from API or context
    const allItems = typeof window !== 'undefined' && window.localStorage.getItem('all_cart_items')
        ? JSON.parse(window.localStorage.getItem('all_cart_items')!)
        : [];
    // Filter out items already in selectedItems
    const availableItems = allItems.filter((item: any) => !selectedItems.some((si: any) => si.id === item.id));

    const handleAddItem = () => {
        if (!addItemId) return;
        const item = allItems.find((i: any) => i.id === Number(addItemId));
        if (item) {
            setSelectedItems(prev => [...prev, { ...item, qty: addItemQty }]);
            setAddItemId('');
            setAddItemQty(1);
        }
    };

    // Sidebar state
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Load cartItems.json for sidebar item list
    // (Assume import or dynamic import for SSR/Next.js)
    let cartItems: any[] = [];
    try {
        cartItems = require('./cartItems.json');
    } catch { }

    // Track the last added item for highlight effect
    const [lastAddedId, setLastAddedId] = useState<number | null>(null);

    // Add item from sidebar to selectedItems or increment qty if already exists
    const handleSidebarAdd = (item: any) => {
        setSelectedItems(prev => {
            const existing = prev.find((si: any) => si.id === item.id);
            if (existing) {
                return prev.map((si: any) =>
                    si.id === item.id ? { ...si, qty: (si.qty || 1) + 1 } : si
                );
            } else {
                setLastAddedId(item.id);
                return [...prev, { ...item, qty: 1 }];
            }
        });
    };

    // Remove highlight after a short delay
    useEffect(() => {
        if (lastAddedId !== null) {
            const timeout = setTimeout(() => setLastAddedId(null), 1200);
            return () => clearTimeout(timeout);
        }
    }, [lastAddedId]);

    useEffect(() => {
        // Listen for closeSidebar event
        const handler = () => {
            setSidebarOpen(false); // Directly manage sidebar state
        };
        window.addEventListener('closeSidebar', handler);
        return () => window.removeEventListener('closeSidebar', handler);
    }, []);

    return (
        <div>
            <div className="flex justify-end items-center mb-4">
                <button
                    className="px-4 py-2 bg-primary text-white rounded dark:bg-neutral-500"
                    onClick={handleShowForm}
                >
                    {showForm ? 'Close Form' : 'Issue Request'}
                </button>
            </div>

            {showForm && (
                <div className="mb-6 p-6">
                    {/* Stock Request Form */}
                    <div className="bg-gray-50 dark:bg-neutral-800 p-4 rounded border mb-4">
                        <h2 className="text-lg text-center font-bold mb-6">Stock Request Form</h2>

                        {/* Request Information */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            {/* Left Column */}
                            <div className="flex flex-col gap-4">
                                <div>
                                    <label className="block text-sm font-medium">Requisition No:</label>
                                    <input type="text" className="form-input w-full" value="REQ-12345" readOnly />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Requestor Name:</label>
                                    <input type="text" className="form-input w-full" value="John Doe" readOnly />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Requestor ID:</label>
                                    <input type="text" className="form-input w-full" value="12345" readOnly />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Used For:</label>
                                    <div className="flex items-center gap-4">
                                        <label className="flex items-center">
                                            <input type="radio" name="usedFor" value="DMA" className="form-radio" /> DMA
                                        </label>
                                        <label className="flex items-center">
                                            <input type="radio" name="usedFor" value="Inter-District" className="form-radio" /> Inter-District
                                        </label>
                                        <label className="flex items-center">
                                            <input type="radio" name="usedFor" value="Other" className="form-radio" /> Other
                                        </label>
                                    </div>
                                    <textarea className="form-textarea w-full mt-2" rows={3} placeholder="If Other, specify..." disabled></textarea>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="flex flex-col gap-4">
                                <div>
                                    <label className="block text-sm font-medium">Date:</label>
                                    <input type="text" className="form-input w-full" value={new Date().toLocaleDateString()} readOnly />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">District:</label>
                                    <select className="form-select w-full">
                                        <option value="">Select District</option>
                                        <option value="District 1">District 1</option>
                                        <option value="District 2">District 2</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Department:</label>
                                    <select className="form-select w-full">
                                        <option value="">Select Department</option>
                                        <option value="IT">IT</option>
                                        <option value="HR">HR</option>
                                        <option value="Finance">Finance</option>
                                        <option value="Operations">Operations</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Section:</label>
                                    <input type="text" className="form-input w-full" value="Support" readOnly />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Cost Center:</label>
                                    <select className="form-select w-full">
                                        <option value="">Select Cost Center</option>
                                        <option value="CC1">CC1</option>
                                        <option value="CC2">CC2</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Items Section */}
                        <div className="mb-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-semibold">Items</span>
                                <button
                                    className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-white shadow-none"
                                    type="button"
                                    onClick={() => setSidebarOpen(true)}
                                >
                                    <FontAwesomeIcon icon={faPlus} size='lg' />
                                </button>
                            </div>
                            <table className="table-auto table-striped w-full border bg-white dark:bg-gray-900">
                                <thead>
                                    <tr className="bg-gray-100 dark:bg-neutral-800">
                                        <th className="border px-2 py-1">No</th>
                                        <th className="border px-2 py-1">Item Name</th>
                                        <th className="border px-2 py-1">Serial No</th>
                                        <th className="border px-2 py-1">Qty</th>
                                        <th className="border px-2 py-1">Remarks</th>
                                        <th className="border px-2 py-1 w-8"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedItems.map((item, index) => (
                                        <tr key={index} className={item.id === lastAddedId ? 'bg-emerald-200 transition-colors duration-500' : ''}>
                                            <td className="border px-2 py-0.5 text-center">{index + 1}</td>
                                            <td className="border px-2 py-0.5">{item.name}</td>
                                            <td className="border px-2 py-0.5">
                                                <input
                                                    type="text"
                                                    className="form-input form-input-sm w-full rounded-none border-none px-0"
                                                    placeholder="Serial No"
                                                    value={item.serialNo || ''}
                                                    onChange={e => {
                                                        const serialNo = e.target.value;
                                                        setSelectedItems(prev => prev.map(si =>
                                                            si.id === item.id ? { ...si, serialNo } : si
                                                        ));
                                                    }}
                                                />
                                            </td>
                                            <td className="border px-2 py-0.5">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    className="form-input form-input-sm w-full text-center border-none px-0"
                                                    placeholder='0'
                                                    value={item.qty}
                                                    onChange={e => {
                                                        const qty = Math.max(1, Number(e.target.value));
                                                        setSelectedItems(prev => prev.map(si =>
                                                            si.id === item.id ? { ...si, qty } : si
                                                        ));
                                                    }}
                                                />
                                            </td>
                                            <td className="border px-2 py-0.5">
                                                <textarea
                                                    className="form-textarea form-textarea-sm w-full border-none px-0"
                                                    placeholder="Remarks"
                                                    rows={1}
                                                    value={item.remarks || ''}
                                                    onChange={e => {
                                                        const remarks = e.target.value;
                                                        setSelectedItems(prev => prev.map(si =>
                                                            si.id === item.id ? { ...si, remarks } : si
                                                        ));
                                                    }}
                                                />
                                            </td>
                                            <td className="border px-2 py-0.5 text-center">
                                                <button
                                                    type="button"
                                                    className="text-red-500 hover:text-red-700 px-2 py-1"
                                                    title="Remove item"
                                                    onClick={() => setSelectedItems(prev => prev.filter(si => si.id !== item.id))}
                                                >
                                                    <FontAwesomeIcon icon={faPlusCircle} className="rotate-45" size='xl' />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr>
                                        <td colSpan={3} className="border px-2 py-1 text-right font-bold">Total</td>
                                        <td className="border px-2 py-1 text-center font-bold">{selectedItems.reduce((sum, item) => sum + (item.qty || 0), 0)}</td>
                                        <td className="border px-2 py-1"></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* ActionSidebar for adding items */}
                        {sidebarOpen && (
                            <ActionSidebar
                                title="Item Cart"
                                onClose={() => setSidebarOpen(false)}
                                size="md"
                                content={
                                    <SidebarItemPicker
                                        cartItems={cartItems}
                                        selectedItems={selectedItems}
                                        onAdd={handleSidebarAdd}
                                    />
                                }
                            />
                        )}

                        {/* Buttons */}
                        <div className="flex justify-center gap-4 mt-6">
                            <button className="btn bg-amber-500 hover:bg-amber-600 text-dark-light px-4 py-2 rounded shadow-none">Save Draft</button>
                            <button className="btn bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded shadow-none">Submit</button>
                            <button className="btn bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded shadow-none" onClick={() => setShowForm(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
            {!showForm && (
                <>
                    {/* Table of applications */}
                    <CustomDataGrid columns={columns as any} data={applications} />
                    {applications.length === 0 && (
                        <div className="text-gray-500 text-center py-10">No stock out applications yet.</div>
                    )}
                </>
            )}
        </div>
    );
};

export default COutApp;

/* 
Payload:
{
  "requisitionNo": "REQ-12345",
  "requestorName": "John Doe",
  "requestorId": "12345",
  "usedFor": "DMA", // or "Inter-District" or "Other"
  "date": "20/5/2025",
  "district": "District 1",
  "department": "IT",
  "section": "Support",
  "costCenter": "CC1",
  "items": [
    {
      "id": 1,
      "name": "Item Name",
      "serialNo": "SN123",
      "qty": 2,
      "remarks": "Some remarks"
    },
    // ...more items
  ]
}
*/
