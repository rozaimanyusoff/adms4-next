'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CustomDataGrid, type ColumnDef } from '@/components/ui/DataGrid';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Play, FileText, LayoutGrid, Rows, Upload, FileVideo2, FileImage, FileText as FileTextIcon, Search, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type MediaKind = 'document' | 'image' | 'video';

type MediaItem = {
    id: string;
    name: string;
    kind: MediaKind;
    size: number;
    uploadedAt: string;
    previewUrl: string;
    streamUrl?: string;
    mimeType?: string;
    tags?: string[];
    projectId?: number | null;
};

const formatBytes = (bytes: number) => {
    if (!bytes) return '—';
    const units = ['B', 'KB', 'MB', 'GB'];
    const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, power)).toFixed(power === 0 ? 0 : 1)} ${units[power]}`;
};

const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const mapApiToMediaItem = (item: any): MediaItem => ({
    id: String(item.id ?? item.fileUrl ?? crypto.randomUUID()),
    name: item.name ?? 'Untitled',
    kind: (item.kind as MediaKind) ?? 'document',
    size: Number(item.size) || 0,
    uploadedAt: item.created_at || item.updated_at || new Date().toISOString(),
    previewUrl: item.file_url || item.fileUrl || '',
    streamUrl: item.streamUrl,
    mimeType: item.mime_type || item.mimeType,
    tags: item.tags ?? [],
    projectId: item.project_id ?? item.projectId ?? null,
});

const MediaCard = ({ item, onPlay }: { item: MediaItem; onPlay: (item: MediaItem) => void }) => {
    const palette =
        item.kind === 'image'
            ? { bg: 'bg-gradient-to-br from-emerald-50 to-cyan-50', icon: <FileImage className="h-6 w-6 text-emerald-600" /> }
            : item.kind === 'video'
                ? { bg: 'bg-gradient-to-br from-indigo-50 to-purple-50', icon: <FileVideo2 className="h-6 w-6 text-indigo-600" /> }
                : { bg: 'bg-gradient-to-br from-amber-50 to-orange-50', icon: <FileTextIcon className="h-6 w-6 text-amber-600" /> };

    return (
        <div
            className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
            onClick={() => {
                if (item.kind === 'video') onPlay(item);
            }}
        >
            <div className={cn('relative aspect-4/3 w-full overflow-hidden', palette.bg)}>
                {item.kind === 'image' && item.previewUrl ? (
                    <img src={item.previewUrl} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-5xl text-slate-500">
                        {palette.icon}
                    </div>
                )}
            </div>
            <div className="flex items-start justify-between px-3 pb-3 pt-2">
                <div className="space-y-1">
                    <div className="text-sm font-semibold text-slate-900 line-clamp-2">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                        {formatBytes(item.size)} • {formatDate(item.uploadedAt)}
                    </div>
                </div>
                <div className="flex gap-1 opacity-0 transition group-hover:opacity-100" />
            </div>
        </div>
    );
};

export const DocsMediaCatalog = () => {
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [view, setView] = useState<'grid' | 'table'>('grid');
    const [filter, setFilter] = useState<MediaKind | 'all'>('all');
    const [search, setSearch] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [playerItem, setPlayerItem] = useState<MediaItem | null>(null);

    const fetchMedia = useCallback(async (kind: MediaKind | 'all') => {
        setLoading(true);
        try {
            const res = await authenticatedApi.get<{ data: { items: any[] } }>('/api/media', {
                params: {
                    kind: kind === 'all' ? undefined : kind,
                    page: 1,
                    limit: 100,
                },
            });
            const apiItems = res?.data?.data?.items;
            const items = Array.isArray(apiItems) ? apiItems.map(mapApiToMediaItem) : [];
            setMediaItems(items);
        } catch (error: any) {
            console.error('Failed to fetch media', error);
            toast.error('Could not load media library');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMedia(filter);
    }, [fetchMedia, filter]);

    const filtered = useMemo(() => {
        return mediaItems.filter((item) => {
            const matchesKind = filter === 'all' ? true : item.kind === filter;
            const matchesSearch = search
                ? item.name.toLowerCase().includes(search.toLowerCase()) ||
                    item.mimeType?.toLowerCase().includes(search.toLowerCase())
                : true;
            return matchesKind && matchesSearch;
        });
    }, [filter, mediaItems, search]);


    const columns = useMemo<ColumnDef<MediaItem>[]>(() => [
        {
            key: 'name',
            header: 'Name',
            sortable: true,
            render: (row) => (
                <div className="flex items-center gap-2">
                    <span className="text-base">{row.kind === 'image' ? '🖼️' : row.kind === 'video' ? '🎬' : '📄'}</span>
                    <span className="font-semibold text-slate-900">{row.name}</span>
                    <Badge variant="secondary" className="capitalize">{row.kind}</Badge>
                </div>
            ),
        },
        {
            key: 'size',
            header: 'Size',
            sortable: true,
            render: (row) => <span className="text-sm text-muted-foreground">{formatBytes(row.size)}</span>,
        },
        {
            key: 'uploadedAt',
            header: 'Uploaded',
            sortable: true,
            render: (row) => <span className="text-sm text-muted-foreground">{formatDate(row.uploadedAt)}</span>,
        },
        {
            key: 'mimeType',
            header: 'Type',
            sortable: true,
            render: (row) => <span className="text-sm text-muted-foreground">{row.mimeType ?? '—'}</span>,
        },
        {
            key: 'previewUrl',
            header: 'Open',
            render: (row) => (
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            if (row.kind === 'video') {
                                setPlayerItem(row);
                            } else {
                                window.open(row.previewUrl, '_blank', 'noreferrer');
                            }
                        }}
                    >
                        {row.kind === 'video' ? <Play className="mr-2 h-4 w-4" /> : <FileText className="mr-2 h-4 w-4" />}
                        {row.kind === 'video' ? 'Play' : 'View'}
                    </Button>
                </div>
            ),
        },
    ], []);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                    <h1 className="text-3xl font-semibold text-slate-900">Media Manager</h1>
                    <p className="text-sm text-muted-foreground">Manage and preview your images, videos, and documents.</p>
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search media files..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 pr-3"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                        {(['all', 'image', 'video', 'document'] as (MediaKind | 'all')[]).map((k) => {
                            const label = k === 'all' ? 'All Media' : k === 'image' ? 'Images' : k === 'video' ? 'Videos' : 'Documents';
                            const active = filter === k;
                            return (
                                <Button
                                    key={k}
                                    variant={active ? 'default' : 'outline'}
                                    size="sm"
                                    className={cn('rounded-full', active ? '' : 'bg-white')}
                                    onClick={() => setFilter(k)}
                                >
                                    {label}
                                </Button>
                            );
                        })}
                    </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <div className="flex gap-2">
                        <Button variant="outline" size="icon" aria-label="Grid view" onClick={() => setView('grid')} className={view === 'grid' ? 'bg-slate-100' : ''}>
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" aria-label="Table view" onClick={() => setView('table')} className={view === 'table' ? 'bg-slate-100' : ''}>
                            <Rows className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        Showing {filtered.length} of {mediaItems.length} files
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, idx) => (
                        <Skeleton key={idx} className="h-64 w-full rounded-xl" />
                    ))}
                </div>
            ) : view === 'grid' ? (
                filtered.length ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filtered.map((item) => (
                            <MediaCard key={item.id} item={item} onPlay={setPlayerItem} />
                        ))}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
                        No media found. Try adjusting filters or upload new files.
                    </div>
                )
            ) : (
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Library Table View</CardTitle>
                        <CardDescription>Sortable, searchable inventory of every media item.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <CustomDataGrid
                            data={filtered}
                            columns={columns}
                            pageSize={8}
                            pagination
                            inputFilter={false}
                            dataExport={false}
                            columnsVisibleOption={false}
                            persistenceKey="docsMediaCatalog"
                            theme={{ layouts: { gridSize: 'md' } }}
                        />
                    </CardContent>
                </Card>
            )}

            <Dialog open={!!playerItem} onOpenChange={(open) => { if (!open) setPlayerItem(null); }}>
                <DialogContent className="sm:max-w-4xl">
                    {playerItem && (
                        <div className="space-y-4">
                            <div className="flex items-start justify-between gap-3 pr-12">
                                <div>
                                    <div className="text-lg font-semibold text-slate-900">{playerItem.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {formatBytes(playerItem.size)} • {formatDate(playerItem.uploadedAt)}
                                    </div>
                                </div>
                                {playerItem.previewUrl && (
                                    <Button variant="outline" size="sm" asChild>
                                        <a href={playerItem.previewUrl} download>
                                            <Download className="mr-2 h-4 w-4" /> Download
                                        </a>
                                    </Button>
                                )}
                            </div>
                            <div className="overflow-hidden rounded-xl border bg-black">
                                {playerItem.kind === 'video' ? (
                                    <video
                                        key={playerItem.id}
                                        className="w-full max-h-[70vh] bg-black"
                                        src={playerItem.streamUrl || playerItem.previewUrl}
                                        controls
                                        controlsList="nodownload noremoteplayback"
                                        disablePictureInPicture
                                    />
                                ) : playerItem.kind === 'image' ? (
                                    <img src={playerItem.previewUrl} alt={playerItem.name} className="w-full object-contain" />
                                ) : (
                                    <iframe className="h-[70vh] w-full bg-white" src={playerItem.previewUrl} title={playerItem.name} />
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

        </div>
    );
};

export default DocsMediaCatalog;
