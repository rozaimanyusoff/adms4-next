'use client';
import React, { useState, useEffect } from 'react';
import { authenticatedApi } from '@/config/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, List, Grid, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

// Type for stock item from API
interface StockItem {
    id: number;
    item_code: string;
    item_name: string;
    image?: string | null;
    total_in: number;
    total_out: number;
    balance: number;
    category_id?: number | null;
    brand_id?: number | null;
    model_id?: number | null;
    specification?: string | null;
    color?: string | null;
    material?: string | null;
    brand?: string | null;
    product_type?: string | null; // Added product_type as optional
    stock_location?: string | null;
    stock_status?: string | null;
    min_qty?: number | null;
    max_qty?: number | null;
    type_id?: string | null;
}

const CItems = () => {
    const [search, setSearch] = useState('');
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const [formVisible, setFormVisible] = useState(false);
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
    const [formData, setFormData] = useState<Partial<StockItem>>({});
    const [items, setItems] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [typeOptions, setTypeOptions] = useState<{ id: number, name: string }[]>([]);
    const [categoryOptions, setCategoryOptions] = useState<{ id: number, name: string }[]>([]);
    const [brandOptions, setBrandOptions] = useState<{ id: number, name: string }[]>([]);
    const [modelOptions, setModelOptions] = useState<{ id: number, name: string }[]>([]);

    useEffect(() => {
        setLoading(true);
        setError(null);
        authenticatedApi.get('/api/stock/items')
            .then(res => {
                const data = Array.isArray((res as any).data?.data) ? (res as any).data.data : [];
                setItems(data);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });

        // Fetch dropdown options for type, category, brand, model
        authenticatedApi.get('/api/assets/types').then(res => {
            const arr = Array.isArray(res.data) ? res.data : (res.data && Array.isArray((res.data as any).data) ? (res.data as any).data : []);
            setTypeOptions(arr.map((t: any) => ({ id: Number(t.id), name: t.name })));
        });
        authenticatedApi.get('/api/assets/categories').then(res => {
            const arr = Array.isArray(res.data) ? res.data : (res.data && Array.isArray((res.data as any).data) ? (res.data as any).data : []);
            setCategoryOptions(arr.map((t: any) => ({ id: Number(t.id), name: t.name })));
        });
        authenticatedApi.get('/api/assets/brands').then(res => {
            const arr = Array.isArray(res.data) ? res.data : (res.data && Array.isArray((res.data as any).data) ? (res.data as any).data : []);
            setBrandOptions(arr.map((t: any) => ({ id: Number(t.id), name: t.name })));
        });
        authenticatedApi.get('/api/assets/models').then(res => {
            const arr = Array.isArray(res.data) ? res.data : (res.data && Array.isArray((res.data as any).data) ? (res.data as any).data : []);
            setModelOptions(arr.map((t: any) => ({ id: Number(t.id), name: t.name })));
        });
    }, []);

    // Remove category, location, and stock range filtering. Only filter by search input.
    const filteredItems = items.filter((item: StockItem) => {
        const matchesSearch = (item.item_name?.toLowerCase() || '').includes(search.toLowerCase()) || (item.item_code?.toLowerCase() || '').includes(search.toLowerCase());
        return matchesSearch;
    });

    const ITEMS_PER_PAGE = 12;
    const [page, setPage] = useState(1);
    const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
    const paginatedItems = filteredItems.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    // Handler for opening the form
    const handleOpenForm = (item?: StockItem) => {
        if (item) {
            setFormMode('edit');
            setFormData({ ...item });
        } else {
            setFormMode('create');
            setFormData({});
        }
        setFormVisible(true);
    };

    // Handler for closing the form
    const handleCloseForm = () => {
        setFormVisible(false);
        setFormData({});
        setFormMode('create'); // Always reset to create mode
    };

    // Handler for form field changes
    const handleFormChange = (field: keyof StockItem, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Handler for form submit (create/update)
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Prepare payload (exclude total_in, total_out, balance)
        const payload = { ...formData };
        delete (payload as any).total_in;
        delete (payload as any).total_out;
        delete (payload as any).balance;
        try {
            if (formMode === 'edit' && formData.id) {
                await authenticatedApi.put(`/api/stock/items/${formData.id}`, payload);
            } else {
                await authenticatedApi.post('/api/stock/items', payload);
            }
            // Refresh items
            setLoading(true);
            const res = await authenticatedApi.get('/api/stock/items');
            const data = Array.isArray((res as any).data?.data) ? (res as any).data.data : [];
            setItems(data);
            setLoading(false);
            handleCloseForm();
        } catch (err) {
            // Optionally show error toast
        }
    };

    // Remove left pane and cart count UI
    if (loading) return <div className="text-gray-500 text-center py-10">Loading...</div>;
    if (error) return <div className="text-red-500 text-center py-10">{error}</div>;

    return (
        <div className="flex min-h-[80vh] h-full gap-4 mt-4">
            <section className="flex flex-col w-full">
                {/* Inline Create/Update Form */}
                {formVisible && (
                  <div className="mb-8 w-full bg-white dark:bg-neutral-900 rounded-xl shadow p-8 border border-gray-200 dark:border-neutral-800 flex flex-col md:flex-row gap-8">
                    {/* Left: Product Image and Thumbnails */}
                    <div className="flex flex-col items-center md:w-1/3 w-full">
                      <div className="w-full flex flex-col items-center mb-4 gap-2">
                        <img
                          src={formData.image || "/assets/images/product-camera.jpg"}
                          alt={formData.item_name || "Product image"}
                          className="w-64 h-64 object-contain rounded border border-gray-200 dark:border-neutral-800 bg-white"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-2 flex items-center gap-2"
                          onClick={() => document.getElementById('image-upload')?.click()}
                        >
                          <span className="material-icons text-lg">photo_camera</span>
                          Change Image
                        </Button>
                        <input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              // For demo: convert to base64 and set as image
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                setFormData(prev => ({ ...prev, image: ev.target?.result as string }));
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </div>
                      {/* Thumbnails (static for now, could be extended) */}
                      <div className="flex gap-2 mt-2">
                        <img src={formData.image || "/assets/images/product-camera.jpg"} className="w-12 h-12 object-contain rounded border" alt="thumb" />
                        <img src="/assets/images/product-laptop.jpg" className="w-12 h-12 object-contain rounded border" alt="thumb" />
                        <img src="/assets/images/product-headphones.jpg" className="w-12 h-12 object-contain rounded border" alt="thumb" />
                      </div>
                    </div>
                    {/* Right: Product Details Form */}
                    <div className="flex-1 flex flex-col gap-4">
                      <div className="flex items-center justify-between mb-2">
                        <h2 className="text-2xl font-semibold">
                          {formMode === 'edit' ? 'Update Item' : 'Create Item'}
                        </h2>
                        {formMode === 'edit' && (
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="rounded-full border border-gray-300 dark:border-neutral-700"
                              onClick={() => {
                                const idx = items.findIndex(i => i.id === formData.id);
                                if (idx > 0) {
                                  setFormData({ ...items[idx - 1] });
                                }
                              }}
                              disabled={items.findIndex(i => i.id === formData.id) <= 0}
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
                                const idx = items.findIndex(i => i.id === formData.id);
                                if (idx >= 0 && idx < items.length - 1) {
                                  setFormData({ ...items[idx + 1] });
                                }
                              }}
                              disabled={(() => { const idx = items.findIndex(i => i.id === formData.id); return idx === -1 || idx === items.length - 1; })()}
                              title="Next Item"
                            >
                              <ChevronRight size={20} />
                            </Button>
                          </div>
                        )}
                      </div>
                      <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-4">
                            <div>
                              <Label htmlFor="item_code" className="mb-2">Item Code</Label>
                              <Input
                                id="item_code"
                                value={formData.item_code || ''}
                                onChange={e => handleFormChange('item_code', e.target.value)}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="item_name" className="mb-2">Item Name</Label>
                              <Input
                                id="item_name"
                                value={formData.item_name || ''}
                                onChange={e => handleFormChange('item_name', e.target.value)}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="category_id" className="mb-2">Category</Label>
                              <Select value={formData.category_id ? String(formData.category_id) : ''} onValueChange={val => handleFormChange('category_id', Number(val))}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                  {categoryOptions.map(opt => (
                                    <SelectItem key={String(opt.id)} value={String(opt.id)}>{opt.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="specification" className="mb-2">Specification</Label>
                            <Textarea
                              id="specification"
                              value={formData.specification || ''}
                              onChange={e => handleFormChange('specification', e.target.value)}
                              className="w-full"
                              rows={5}
                            />
                          </div>
                        </div>
                        {/* Inventory-specific fields: Type, Brand, Model */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="type_id" className="mb-2">Product Type</Label>
                            <Select value={formData.type_id ? String(formData.type_id) : ''} onValueChange={val => handleFormChange('type_id', Number(val))}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                {typeOptions.map(opt => (
                                  <SelectItem key={String(opt.id)} value={String(opt.id)}>{opt.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="brand_id" className="mb-2">Brand</Label>
                            <Select value={formData.brand_id ? String(formData.brand_id) : ''} onValueChange={val => handleFormChange('brand_id', Number(val))}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select brand" />
                              </SelectTrigger>
                              <SelectContent>
                                {brandOptions.map(opt => (
                                  <SelectItem key={String(opt.id)} value={String(opt.id)}>{opt.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="model_id" className="mb-2">Model</Label>
                            <Select value={formData.model_id ? String(formData.model_id) : ''} onValueChange={val => handleFormChange('model_id', Number(val))}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select model" />
                              </SelectTrigger>
                              <SelectContent>
                                {modelOptions.map(opt => (
                                  <SelectItem key={String(opt.id)} value={String(opt.id)}>{opt.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {/* Stock Location and Status */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="stock_location" className="mb-2">Stock Location</Label>
                            <Input
                              id="stock_location"
                              value={formData.stock_location || ''}
                              onChange={e => handleFormChange('stock_location', e.target.value)}
                              placeholder="e.g. Warehouse A"
                            />
                          </div>
                          <div>
                            <Label htmlFor="stock_status" className="mb-2">Stock Status</Label>
                            <select
                              id="stock_status"
                              value={formData.stock_status || ''}
                              onChange={e => handleFormChange('stock_status', e.target.value)}
                              className="w-full rounded border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2"
                            >
                              <option value="">Select status</option>
                              <option value="in_stock">In Stock</option>
                              <option value="out_of_stock">Out of Stock</option>
                              <option value="low_stock">Low Stock</option>
                              <option value="preorder">Preorder</option>
                            </select>
                          </div>
                        </div>
                        {/* Min/Max Qty */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="min_qty" className="mb-2">Min Qty</Label>
                            <Input
                              id="min_qty"
                              type="number"
                              value={formData.min_qty || ''}
                              onChange={e => handleFormChange('min_qty', e.target.value)}
                              placeholder="e.g. 1"
                              min={0}
                            />
                          </div>
                          <div>
                            <Label htmlFor="max_qty" className="mb-2">Max Qty</Label>
                            <Input
                              id="max_qty"
                              type="number"
                              value={formData.max_qty || ''}
                              onChange={e => handleFormChange('max_qty', e.target.value)}
                              placeholder="e.g. 100"
                              min={0}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                          <Button type="submit" variant="default">Save</Button>
                          <Button type="button" variant="outline" onClick={handleCloseForm}>Cancel</Button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
                {/* Search Bar + Actions */}
                {!formVisible && (
                <div className="mb-4 flex items-center gap-2">
                    <Input
                        type="text"
                        placeholder="Search items..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); }}
                        className="w-full"
                    />
                    <Button
                        variant="default"
                        className="flex items-center gap-1 px-3 py-2"
                        onClick={() => handleOpenForm()}
                        title="Add Item"
                    >
                        <Plus size={18} /> <span className="hidden sm:inline">Item</span>
                    </Button>
                    <Button
                        variant={view === 'list' ? 'default' : 'outline'}
                        className="px-2 py-2"
                        onClick={() => setView('list')}
                        title="List View"
                    >
                        <List size={18} />
                    </Button>
                    <Button
                        variant={view === 'grid' ? 'default' : 'outline'}
                        className="px-2 py-2"
                        onClick={() => setView('grid')}
                        title="Grid View"
                    >
                        <Grid size={18} />
                    </Button>
                </div>
                )}
                {/* Items Grid/List - always visible */}
                <>
                {!formVisible && (
                  view === 'grid' ? (
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-start">
                        {paginatedItems.length === 0 && (
                            <div className="col-span-full text-center text-gray-500 py-10">No items found.</div>
                        )}
                        {paginatedItems.map((item: StockItem) => (
                            <Card
                                key={item.id}
                                className="relative flex flex-col items-center h-full min-h-[260px] max-h-[340px]"
                            >
                                {/* 3-dots menu */}
                                <div className="absolute top-2 right-2 z-10">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 p-0">
                                                <MoreVertical size={18} />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleOpenForm(item)}>
                                                Update
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <CardContent className="flex flex-col items-center w-full">
                                    <img src={item.image || '/assets/images/product-camera.jpg'} alt={item.item_name} className="w-24 h-24 object-contain mb-3 rounded" />
                                    <div className="font-semibold text-md text-center mb-2">{item.item_name}</div>
                                    <div className="text-xs text-gray-700 mb-1">Item Code: {item.item_code}</div>
                                    <div className={`font-bold mb-2 ${item.balance === 0 ? 'text-red-500' : 'text-green-600'}`}>Stock: {item.balance}</div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col gap-2">
                        {paginatedItems.length === 0 && (
                            <div className="text-center text-gray-500 py-10">No items found.</div>
                        )}
                        {paginatedItems.map((item: StockItem) => (
                            <Card
                                key={item.id}
                                className="flex flex-row items-center gap-4 border border-gray-200 dark:border-neutral-800"
                            >
                                <CardContent className="flex flex-row items-center gap-4 w-full p-0 py-4 px-4">
                                    <img src={item.image || '/assets/images/product-camera.jpg'} alt={item.item_name} className="w-16 h-16 object-contain rounded" />
                                    <div className="flex-1">
                                        <div className="font-semibold text-md mb-1">{item.item_name}</div>
                                        <div className="text-xs text-gray-700 mb-1">Item Code: {item.item_code}</div>
                                        <div className={`font-bold ${item.balance === 0 ? 'text-red-500' : 'text-green-600'}`}>Stock: {item.balance}</div>
                                    </div>
                                    <div className="ml-auto">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 p-0">
                                                    <MoreVertical size={18} />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleOpenForm(item)}>
                                                    Update
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )
                )}
                {/* Pagination */}
                {!formVisible && (
                  <div className="flex justify-center items-center gap-2 mt-6">
                    <Button
                        variant="outline"
                        className="px-3 py-1"
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                    >
                        Prev
                    </Button>
                    <span className="px-2 text-sm">Page {page} of {totalPages}</span>
                    <Button
                        variant="outline"
                        className="px-3 py-1"
                        onClick={() => setPage(page + 1)}
                        disabled={page === totalPages}
                    >
                        Next
                    </Button>
                  </div>
                )}
                </>
            </section>
        </div>
    );
};

export default CItems;
