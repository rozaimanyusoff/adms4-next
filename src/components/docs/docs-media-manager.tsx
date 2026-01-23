'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { authenticatedApi } from '@/config/api';
import { toast } from 'sonner';

type MediaKind = 'document' | 'image' | 'video';

type MediaItem = {
    id: string;
    name: string;
    kind: MediaKind;
    size: number;
    uploadedAt: string;
    previewUrl: string;
    mimeType?: string;
    fromObjectUrl?: boolean;
};

const starterMedia: MediaItem[] = [
    {
        id: 'doc-1',
        name: 'Vehicle Maintenance Guide.pdf',
        kind: 'document',
        size: 1.9 * 1024 * 1024,
        uploadedAt: '2026-01-08T10:00:00Z',
        previewUrl: '/assets/docs/vehicle-mtn-guide.pdf',
        mimeType: 'application/pdf',
    },
    {
        id: 'img-1',
        name: 'Warehouse-layout.jpeg',
        kind: 'image',
        size: 620 * 1024,
        uploadedAt: '2026-01-15T14:22:00Z',
        previewUrl: '/assets/images/drag-2.jpeg',
        mimeType: 'image/jpeg',
    },
    {
        id: 'vid-1',
        name: 'Induction-clip.mp4',
        kind: 'video',
        size: 5.2 * 1024 * 1024,
        uploadedAt: '2026-01-18T09:10:00Z',
        previewUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        mimeType: 'video/mp4',
    },
];

const kindCopy: Record<MediaKind, { title: string; accent: string; desc: string; accepts: string; helper: string }> = {
    document: {
        title: 'Documents',
        accent: 'from-slate-900 via-slate-800 to-slate-700',
        desc: 'PDF, DOCX, XLSX and other project documents.',
        accepts: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt',
        helper: 'Drag a file here or browse',
    },
    image: {
        title: 'Images',
        accent: 'from-amber-500 via-orange-500 to-rose-500',
        desc: 'JPG, PNG, SVG, WEBP screenshots and photos.',
        accepts: 'image/*',
        helper: 'Drop product shots or screenshots',
    },
    video: {
        title: 'Video',
        accent: 'from-sky-500 via-indigo-500 to-fuchsia-500',
        desc: 'MP4, MOV or WEBM walkthroughs and explainers.',
        accepts: 'video/mp4,video/webm,video/quicktime',
        helper: 'Upload clips to play inline',
    },
};

function formatBytes(bytes: number) {
    if (!bytes) return '—';
    const units = ['B', 'KB', 'MB', 'GB'];
    const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, power)).toFixed(power === 0 ? 0 : 1)} ${units[power]}`;
}

function formatDate(iso: string) {
    const date = new Date(iso);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type UploadTileProps = {
    kind: MediaKind;
    onFile: (file: File) => void;
};

const UploadTile = ({ kind, onFile }: UploadTileProps) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [dragActive, setDragActive] = useState(false);

    const copy = kindCopy[kind];

    const handleSelect = (fileList: FileList | null) => {
        if (!fileList?.length) return;
        onFile(fileList[0]);
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-2xl border bg-linear-to-br p-px shadow-lg transition-all hover:shadow-xl focus-within:shadow-xl',
                `from-white to-white/80`,
            )}
        >
            <div className="rounded-[1.1rem] bg-white/80 p-5 backdrop-blur">
                <div
                    className={cn(
                        'absolute inset-0 -z-10 opacity-70 blur-xl transition-all',
                        `bg-linear-to-br ${copy.accent}`,
                        dragActive ? 'opacity-100' : '',
                    )}
                />
                <div
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragActive(true);
                    }}
                    onDragLeave={(e) => {
                        e.preventDefault();
                        setDragActive(false);
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragActive(false);
                        handleSelect(e.dataTransfer.files);
                    }}
                    onClick={() => inputRef.current?.click()}
                    className={cn(
                        'flex h-48 cursor-pointer flex-col justify-between rounded-xl border border-dashed border-slate-200 bg-white/70 p-4 text-left transition-all',
                        dragActive ? 'border-slate-400 bg-slate-50' : '',
                    )}
                >
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                            <span className="inline-flex size-8 items-center justify-center rounded-full bg-slate-900/90 text-white">
                                {kind === 'document' ? '📄' : kind === 'image' ? '🖼️' : '🎬'}
                            </span>
                            <span>{copy.title}</span>
                        </div>
                        <div className="text-lg font-semibold text-slate-900">{copy.helper}</div>
                        <p className="text-sm text-slate-600">{copy.desc}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Badge variant="secondary" className="bg-white/80 text-slate-700">
                            {copy.accepts.replace(/,/g, ' • ')}
                        </Badge>
                        <span className="text-xs text-slate-400">Max ~150MB per file*</span>
                    </div>
                </div>
                <input
                    ref={inputRef}
                    type="file"
                    accept={copy.accepts}
                    className="hidden"
                    onChange={(e) => handleSelect(e.target.files)}
                />
            </div>
        </div>
    );
};

export const DocsMediaManager = () => {
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [selectedId, setSelectedId] = useState<string>('');
    const [filter, setFilter] = useState<MediaKind | 'all'>('all');
    const [uploading, setUploading] = useState<{ id: string; progress: number } | null>(null);
    const [isFetching, setIsFetching] = useState<boolean>(false);
    const objectUrlsRef = useRef<Set<string>>(new Set());
    const hasLoadedOnce = useRef<boolean>(false);

    useEffect(() => {
        return () => {
            objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
            objectUrlsRef.current.clear();
        };
    }, []);

    const mapApiToMediaItem = (item: any): MediaItem => ({
        id: String(item.id ?? item.fileUrl ?? crypto.randomUUID()),
        name: item.name ?? 'Untitled',
        kind: item.kind as MediaKind,
        size: Number(item.size) || 0,
        uploadedAt: item.created_at || new Date().toISOString(),
        previewUrl: item.file_url || item.fileUrl || '',
        mimeType: item.mime_type || item.mimeType,
        fromObjectUrl: false,
    });

    const fetchMedia = useCallback(async (kind: MediaKind | 'all') => {
        setIsFetching(true);
        try {
            const res = await authenticatedApi.get<{ data: { items: any[] } }>('/api/media', {
                params: {
                    kind: kind === 'all' ? undefined : kind,
                    page: 1,
                    limit: 50,
                },
            });
            const apiItems = res?.data?.data?.items;
            const items = Array.isArray(apiItems) ? apiItems.map(mapApiToMediaItem) : [];
            setMediaItems(items);
            setSelectedId((prev) => {
                if (prev && items.some((m) => m.id === prev)) return prev;
                return items[0]?.id || '';
            });
            hasLoadedOnce.current = true;
        } catch (error: any) {
            console.error('Failed to fetch media', error);
            toast.error('Could not load media library');
            // Fall back to starter data if nothing loaded yet
            if (!hasLoadedOnce.current) {
                setMediaItems(starterMedia);
                setSelectedId(starterMedia[0]?.id || '');
            }
        } finally {
            setIsFetching(false);
        }
    }, []);

    useEffect(() => {
        fetchMedia(filter);
    }, [fetchMedia, filter]);

    const handleUpload = async (kind: MediaKind, file: File) => {
        const id = `${kind}-${Date.now()}`;
        setUploading({ id, progress: 0 });

        // Lightweight simulated progress for UI feedback
        const progressTimer = setInterval(() => {
            setUploading((prev) => {
                if (!prev || prev.id !== id) return prev;
                const next = Math.min(prev.progress + 18, 95);
                return { ...prev, progress: next };
            });
        }, 120);

        try {
            const presignRes = await authenticatedApi.post<{ data: { uploadUrl: string; fileUrl: string } }>('/api/media/presign', {
                filename: file.name,
                mimeType: file.type,
                kind,
                size: file.size,
            });
            const presign = presignRes?.data?.data;
            if (!presign?.uploadUrl || !presign?.fileUrl) {
                throw new Error('Presign failed: missing uploadUrl or fileUrl');
            }

            await fetch(presign.uploadUrl, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type || 'application/octet-stream',
                },
            });

            const createRes = await authenticatedApi.post<{ data: any }>('/api/media', {
                name: file.name,
                kind,
                fileUrl: presign.fileUrl,
                size: file.size,
                mimeType: file.type,
            });

            const createdPayload = createRes?.data?.data;
            if (!createdPayload) {
                throw new Error('Upload succeeded, but no media data returned.');
            }
            const created = mapApiToMediaItem(createdPayload);
            clearInterval(progressTimer);
            setUploading({ id, progress: 100 });
            setTimeout(() => setUploading(null), 200);

            setMediaItems((prev) => [created, ...prev]);
            setSelectedId(created.id);
            toast.success('Upload complete');
        } catch (error: any) {
            clearInterval(progressTimer);
            setUploading(null);
            console.error('Upload failed', error);
            const message =
                error?.response?.data?.message ||
                error?.message ||
                'Upload failed. Please try again.';
            toast.error(message);
        }
    };

    const removeItem = async (id: string) => {
        const target = mediaItems.find((i) => i.id === id);
        try {
            await authenticatedApi.delete(`/api/media/${id}`);
            setMediaItems((prev) => {
                const filtered = prev.filter((i) => i.id !== id);
                if (selectedId === id) {
                    setSelectedId(filtered[0]?.id || '');
                }
                return filtered;
            });
            if (target?.fromObjectUrl && target.previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(target.previewUrl);
                objectUrlsRef.current.delete(target.previewUrl);
            }
            toast.success('Media removed');
        } catch (error: any) {
            console.error('Delete failed', error);
            const message = error?.response?.data?.message || error?.message || 'Delete failed';
            toast.error(message);
        }
    };

    const filtered = useMemo(() => {
        if (filter === 'all') return mediaItems;
        return mediaItems.filter((item) => item.kind === filter);
    }, [filter, mediaItems]);

    const stats = useMemo(() => {
        return ['document', 'image', 'video'].reduce(
            (acc, kind) => {
                const typed = mediaItems.filter((m) => m.kind === kind);
                acc[kind as MediaKind] = {
                    count: typed.length,
                    size: typed.reduce((s, i) => s + i.size, 0),
                };
                return acc;
            },
            {} as Record<MediaKind, { count: number; size: number }>
        );
    }, [mediaItems]);

    const selected = mediaItems.find((item) => item.id === selectedId) || filtered[0];

    return (
        <div className="space-y-8">
            <section className="overflow-hidden rounded-3xl border bg-linear-to-r from-slate-900 via-slate-800 to-indigo-800 text-white shadow-2xl">
                <div className="grid gap-6 px-8 py-10 md:grid-cols-[1.3fr_1fr] items-center">
                    <div className="space-y-4">
                        <p className="text-xs uppercase tracking-[0.15em] text-white/70">Documents & Media</p>
                        <h1 className="text-3xl font-semibold leading-tight md:text-4xl">
                            Upload, preview, and hand-off files in one intentional workspace.
                        </h1>
                        <p className="text-white/80">
                            Drag anything in — docs for approvals, image references, and product walk-through videos. Everything
                            stays previewable without leaving the page.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <Badge className="bg-white/10 text-white">Version safe</Badge>
                            <Badge className="bg-white/10 text-white">Inline playback</Badge>
                            <Badge className="bg-white/10 text-white">Team friendly</Badge>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                        {(['document', 'image', 'video'] as MediaKind[]).map((kind) => (
                            <div
                                key={kind}
                                className="rounded-2xl bg-white/10 p-4 backdrop-blur transition hover:bg-white/15"
                            >
                                <div className="text-xs uppercase tracking-wide text-white/70">{kindCopy[kind].title}</div>
                                <div className="mt-2 text-2xl font-semibold">{stats[kind]?.count ?? 0}</div>
                                <div className="text-xs text-white/70">Total {formatBytes(stats[kind]?.size || 0)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
                {(['document', 'image', 'video'] as MediaKind[]).map((kind) => (
                    <UploadTile key={kind} kind={kind} onFile={(file) => handleUpload(kind, file)} />
                ))}
            </section>

            {uploading && (
                <Card className="border-dashed border-slate-200 bg-slate-50/70">
                    <CardHeader>
                        <CardTitle>Uploading {uploading.id.split('-')[0]}</CardTitle>
                        <CardDescription>We will keep this tab updated while the file lands in storage.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Progress value={uploading.progress} className="h-2" />
                    </CardContent>
                </Card>
            )}

            <section className="grid gap-6 lg:grid-cols-[1.25fr_0.9fr]">
                <Card className="shadow-md">
                    <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle>Recent uploads</CardTitle>
                            <CardDescription>Click any row to preview or stream it on the right.</CardDescription>
                            {isFetching && (
                                <div className="text-xs text-muted-foreground">Refreshing library…</div>
                            )}
                        </div>
                        <Tabs value={filter} onValueChange={(v) => setFilter(v as MediaKind | 'all')} className="w-full sm:w-auto">
                            <TabsList>
                                <TabsTrigger value="all">All</TabsTrigger>
                                <TabsTrigger value="document">Docs</TabsTrigger>
                                <TabsTrigger value="image">Images</TabsTrigger>
                                <TabsTrigger value="video">Video</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {filtered.length === 0 && (
                            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                                Nothing here yet — drop a file above to get started.
                            </div>
                        )}
                        <div className="divide-y rounded-xl border">
                            {filtered.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setSelectedId(item.id)}
                                    className={cn(
                                        'group flex w-full items-center gap-4 px-4 py-3 text-left transition hover:bg-slate-50',
                                        selected?.id === item.id ? 'bg-slate-50/80' : '',
                                    )}
                                >
                                    <div className="flex size-12 items-center justify-center rounded-lg bg-slate-100 text-xl">
                                        {item.kind === 'document' ? '📄' : item.kind === 'image' ? '🖼️' : '🎬'}
                                    </div>
                                    <div className="flex flex-1 flex-col gap-1">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                            {item.name}
                                            <Badge variant="secondary" className="capitalize">
                                                {item.kind}
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {formatBytes(item.size)} • {formatDate(item.uploadedAt)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedId(item.id); }}>
                                            Preview
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            aria-label="Delete"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeItem(item.id);
                                            }}
                                        >
                                            🗑️
                                        </Button>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Inline preview</CardTitle>
                        <CardDescription>Play video, zoom images, or open documents without leaving.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {!selected && (
                            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                                Select a file to preview.
                            </div>
                        )}
                        {selected && (
                            <>
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <div className="text-base font-semibold text-slate-900">{selected.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {selected.kind.toUpperCase()} • {formatBytes(selected.size)} • {formatDate(selected.uploadedAt)}
                                        </div>
                                    </div>
                                    {selected.kind !== 'video' && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => window.open(selected.previewUrl, '_blank', 'noreferrer')}
                                        >
                                            Open
                                        </Button>
                                    )}
                                </div>
                                <div className="overflow-hidden rounded-xl border bg-slate-50">
                                    {selected.kind === 'image' && (
                                        <img
                                            src={selected.previewUrl}
                                            alt={selected.name}
                                            className="max-h-120 w-full object-contain bg-white"
                                        />
                                    )}
                                    {selected.kind === 'document' && (
                                        <iframe
                                            src={selected.previewUrl}
                                            title={selected.name}
                                            className="h-105 w-full bg-white"
                                        />
                                    )}
                                    {selected.kind === 'video' && (
                                        <video
                                            controls
                                            className="h-105 w-full bg-black"
                                            src={selected.previewUrl}
                                            poster="/assets/images/coming-soon.svg"
                                        >
                                            Your browser does not support the video tag.
                                        </video>
                                    )}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </section>
        </div>
    );
};

export default DocsMediaManager;
