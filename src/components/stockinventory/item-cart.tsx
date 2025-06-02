import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faTh, faList } from '@fortawesome/free-solid-svg-icons';
import { authenticatedApi } from '@/config/api';

const SidebarItemPicker: React.FC<{
    selectedItems: any[];
    onAdd: (item: any) => void;
}> = ({ selectedItems, onAdd }) => {
    const [search, setSearch] = useState('');
    const [view, setView] = useState<'list' | 'card'>('list');
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        authenticatedApi.get<{ data: any[] }>('/api/stock/items')
            .then(res => {
                setItems(res.data?.data || []);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    const handleAdd = (item: any) => {
        onAdd(item);
    };

    const filtered = items.filter(item =>
        !selectedItems.some((si: any) => si.id === item.id) &&
        ((item.item_name?.toLowerCase() || '').includes(search.toLowerCase()) || (item.item_code?.toLowerCase() || '').includes(search.toLowerCase()))
    );

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
                {/* Move view icons to the right of search */}
                <input
                    className="form-input w-full mb-0"
                    placeholder="Search items..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <div className="flex gap-1 ml-2">
                    <button
                        className={`p-1 rounded border ${view === 'list' ? 'bg-primary text-white border-primary' : 'bg-white border-gray-300'}`}
                        onClick={() => setView('list')}
                        title="List View"
                    >
                        <FontAwesomeIcon icon={faList} />
                    </button>
                    <button
                        className={`p-1 rounded border ${view === 'card' ? 'bg-primary text-white border-primary' : 'bg-white border-gray-300'}`}
                        onClick={() => setView('card')}
                        title="Card View"
                    >
                        <FontAwesomeIcon icon={faTh} />
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto mt-2">
                {loading && <div className="text-gray-400 text-center py-8">Loading items...</div>}
                {error && <div className="text-red-500 text-center py-8">{error}</div>}
                {!loading && !error && filtered.length === 0 && (
                    <div className="text-gray-400 text-center py-8">No more items to add.</div>
                )}
                {!loading && !error && (view === 'list' ? (
                    <ul className="divide-y">
                        {filtered.map(item => (
                            <li key={item.id} className="flex items-center justify-start py-1.5">
                                <button
                                    className="text-white"
                                    onClick={() => handleAdd(item)}
                                >
                                    <span>
                                        <FontAwesomeIcon icon={faPlusCircle} size='2xl' className='text-green-600' />
                                    </span>
                                </button>
                                <img
                                    src={item.image || '/assets/images/product-camera.jpg'}
                                    alt={item.item_name}
                                    className="w-10 h-10 object-cover ml-4 mr-3 border border-gray-200 bg-white"
                                />
                                <div className='ps-0'>
                                    <div className="font-semibold">{item.item_name}</div>
                                    <div className="text-xs text-gray-500">Stock: {item.balance}</div>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {filtered.map(item => (
                            <div key={item.id} className="bg-white dark:bg-neutral-800 rounded shadow px-3 py-1 flex items-center border min-h-[110px] hover:bg-neutral-100">
                                {/* Plus icon section */}
                                <div className="flex flex-col items-center justify-center w-12 h-12 mr-3">
                                    <button
                                        className={`${item.balance === 0 ? 'bg-gray-200' : 'bg-gray-100'} rounded-full border-none`}
                                        onClick={() => item.balance > 0 && handleAdd(item)}
                                        disabled={item.balance === 0}
                                        title={item.balance === 0 ? 'Out of stock' : 'Add'}
                                    >
                                        <FontAwesomeIcon icon={faPlusCircle} size="2xl" className={item.balance === 0 ? 'text-gray-400' : 'text-green-600 hover:text-green-700'} />
                                    </button>
                                </div>
                                {/* Image section */}
                                <img
                                    src={item.image || '/assets/images/product-camera.jpg'}
                                    alt={item.item_name}
                                    className="object-cover rounded-sm border-gray-200 bg-white mr-4"
                                />
                                {/* Info section */}
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-base truncate">{item.item_name}</div>
                                    <div className="text-xs text-gray-500 mt-1">Stock: {item.balance}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SidebarItemPicker;
