"use client";

import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from '@/store/AuthContext';
import { authenticatedApi } from "@/config/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SingleSelect } from "@/components/ui/combobox";
import { Textarea } from '@/components/ui/textarea';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Star, Loader2 } from "lucide-react";
import { useSearchParams, useRouter } from 'next/navigation';

interface CriteriaItem {
    qset_id: number;
    qset_quesno: number;
    qset_desc: string;
    qset_type: "NCR" | "Rating" | "Selection";
    qset_order: number;
    dept?: number | null; // criteria ownership department id
    ownership?: string | null; // raw ownership field if provided
    // selection options could be added later
}

interface AssessmentDetail {
    adt_id: number;
    assess_id: number;
    adt_item: string;
    adt_ncr: number;
    adt_rate: string;
    adt_rate2: number;
    adt_rem: string;
    qset_desc: string | null;
    qset_type: string | null;
}

interface AssessmentData {
    assess_id: number;
    a_date: string;
    a_ncr: number;
    a_rate: string;
    a_upload: string | null;
    a_upload2: string | null;
    a_upload3: string | null;
    a_upload4: string | null;
    a_remark: string;
    a_dt: string;
    asset: {
        id: number;
        register_number: string;
        purchase_date: string;
        age: number;
        costcenter: {
            id: number;
            name: string;
        };
        location: {
            id: number;
            code: string;
        };
        owner: {
            ramco_id: string;
            full_name: string;
        };
    };
    assessment_location: {
        id: number;
        code: string;
    };
    details: AssessmentDetail[];
}

interface Vehicle {
    id: number;
    register_number: string;
    owner?: {
        full_name: string;
    };
    location?: {
        id: number;
        name: string;
    };
    // add other vehicle properties as needed
}

interface Location {
    id: number;
    name: string;
    // add other location properties as needed
}

const PAGE_SIZE = 10;

const AssessmentForm: React.FC = () => {
    // Track asset IDs already assessed this year
    const [assessedAssetIds, setAssessedAssetIds] = useState<number[]>([]);
    // Fetch assessment records for the current year, then fetch vehicles after assessedAssetIds is set
    useEffect(() => {
        const fetchAssessedAssetsAndVehicles = async () => {
            try {
                const year = new Date().getFullYear();
                const resp: any = await authenticatedApi.get(`/api/compliance/assessments`, { params: { year } });
                const arr = Array.isArray(resp.data?.data) ? resp.data.data : [];
                const ids = arr
                    .filter((rec: any) => rec.asset && typeof rec.asset.id === 'number')
                    .map((rec: any) => rec.asset.id);
                setAssessedAssetIds(ids);
                // Now fetch vehicles
                try {
                    const vresp: any = await authenticatedApi.get('/api/assets', {
                        params: {
                            type: 2,
                            classification: 'asset',
                            status: 'active'
                        }
                    });
                    const varr = Array.isArray(vresp.data) ? vresp.data : (vresp.data?.data || []);
                    const normalized = varr.map((v: any) => ({
                        id: v.id,
                        register_number: v.register_number || `Asset ${v.id}`,
                        owner: v.owner ? {
                            full_name: v.owner.full_name
                        } : undefined,
                        location: v.location ? {
                            id: v.location.id,
                            name: v.location.name
                        } : undefined
                    }));
                    setVehicles(normalized);
                } catch (e) {
                    toast.error('Failed to fetch vehicles');
                }
            } catch (e) {
                // Fail silently, fallback to showing all vehicles
            }
        };
        fetchAssessedAssetsAndVehicles();
    }, []);
    // Handles drag-and-drop for vehicle images (limit 4)
    const handleVehicleImageDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setVehicleImageDragOver && setVehicleImageDragOver(false);
        const dt = e.dataTransfer;
        if (!dt?.files?.length) return;
        const files = dt.files;
        const maxImages = 4;
        const currentCount = vehicleImages.length;
        const newFiles: File[] = [];
        const newUrls: string[] = [];
        Array.from(files).forEach(file => {
            const isImage = /^image\/(png|jpeg)$/i.test(file.type) || /\.(png|jpg|jpeg)$/i.test(file.name);
            if (isImage) {
                if (currentCount + newFiles.length < maxImages) {
                    newFiles.push(file);
                    newUrls.push(URL.createObjectURL(file));
                }
            }
        });
        if (currentCount + newFiles.length > maxImages) {
            toast.error('Maximum 4 vehicle images allowed.');
        }
        if (newFiles.length > 0) {
            setVehicleImages(prev => [...prev, ...newFiles].slice(0, maxImages));
            setVehicleImageUrls(prev => [...prev, ...newUrls].slice(0, maxImages));
        }
        if (newFiles.length !== files.length) {
            toast.error('Some files were skipped. Only PNG/JPG images are allowed.');
        }
    };

    // Handles file selection for individual criteria proof upload
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, id: number) => {
        const file = e.target.files?.[0] || null;
        if (!file) { setProofFile(id, null); return; }
        const isImage = /^image\/(png|jpeg)$/i.test(file.type) || /\.(png|jpg|jpeg)$/i.test(file.name);
        if (!isImage) {
            setErrors(prev => ({ ...prev, [`file-${id}`]: 'Only PNG or JPG images are allowed.' }));
            toast.error('Only PNG or JPG images are allowed.');
            return;
        }
        setProofFile(id, file);
    };
    const [items, setItems] = useState<CriteriaItem[]>([]);
    const [rawItems, setRawItems] = useState<CriteriaItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [dragOverId, setDragOverId] = useState<number | null>(null);
    // Submission state to prevent double submit and show loader
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Dialog states
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);

    // Editing states
    const [isEditing, setIsEditing] = useState(false);
    const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(null);
    const [loadingAssessment, setLoadingAssessment] = useState(false);

    // Header section state
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [selectedVehicle, setSelectedVehicle] = useState<string>('');
    const [selectedLocation, setSelectedLocation] = useState<string>('');
    const [vehicleImages, setVehicleImages] = useState<File[]>([]);
    const [vehicleImageUrls, setVehicleImageUrls] = useState<string[]>([]);
    // Existing attachments from backend (a_upload*) when editing
    const [existingVehicleImageUrls, setExistingVehicleImageUrls] = useState<string[]>([]);
    const [vehicleImageDragOver, setVehicleImageDragOver] = useState(false);

    const auth = useContext(AuthContext);
    const searchParams = useSearchParams();
    const router = useRouter();
    const assessmentId = searchParams?.get('id') || null;

    useEffect(() => {
        const bootstrap = async () => {
            await fetchOwnershipAndCriteria();
            fetchLocations();
            // Check if editing mode
            if (assessmentId) {
                setIsEditing(true);
                fetchAssessmentData(assessmentId);
            }
        };
        bootstrap();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [assessmentId]);

    const fetchCriteria = async (deptId?: number) => {
        setLoading(true);
        try {
            const params: any = { status: 'active' };
            if (deptId && !Number.isNaN(deptId)) params.ownership = deptId;
            const resp: any = await authenticatedApi.get('/api/compliance/assessments/criteria', { params });
            const arr = Array.isArray(resp.data) ? resp.data : (resp.data?.data || []);
            // Normalize and sort by order
            const normalized = arr.map((r: any) => ({
                qset_id: r.qset_id,
                qset_quesno: r.qset_quesno,
                qset_desc: r.qset_desc,
                qset_type: r.qset_type,
                qset_order: r.qset_order,
                dept: ((): number | null => {
                    const v = Number(r.ownership ?? r.dept ?? r.department_id ?? r.dept_id);
                    return Number.isNaN(v) ? null : v;
                })(),
                ownership: (r.ownership != null ? String(r.ownership) : null),
            })).sort((a: any, b: any) => a.qset_order - b.qset_order);
            setRawItems(normalized);
            // If we're fetching from server with ownership applied, we can directly set items
            setItems(normalized);
        } catch (e) {
            toast.error('Failed to fetch criteria');
        } finally {
            setLoading(false);
        }
    };

    // Ownership mapping: ramco_id -> department_id for criteria ownership
    const [ownershipMap, setOwnershipMap] = useState<{ ramco_id: string; department_id: number; status?: string | null }[]>([]);
    // Resolved ownership department_id for current user (used in payload header)
    const [ownershipDeptId, setOwnershipDeptId] = useState<number | null>(null);

    const fetchOwnershipMap = async (): Promise<{ ramco_id: string; department_id: number; status?: string | null }[]> => {
        try {
            const res: any = await authenticatedApi.get('/api/compliance/assessments/criteria/ownership');
            const raw = res?.data;
            const list: any[] = Array.isArray(raw) ? raw : (raw?.data?.data || raw?.data || []);
            const mapped = list.map((r: any) => ({
                ramco_id: String(r.ramco_id ?? r.username ?? ''),
                department_id: Number(r.department_id ?? r.dept_id ?? 0),
                status: r.status ?? null,
            })).filter((r: any) => r.ramco_id && r.department_id);
            setOwnershipMap(mapped);
            return mapped;
        } catch (e) {
            // fail silently; no ownership restriction
            setOwnershipMap([]);
            return [];
        }
    };

    // Fetch ownership then fetch criteria with relevant ownership filter
    const fetchOwnershipAndCriteria = async () => {
        try {
            const mapped = await fetchOwnershipMap();
            const user = (auth?.authData?.user?.username) || ((auth?.authData?.user as any)?.ramco_id) || '';
            if (!user) {
                // No user identity => no access to criteria
                setRawItems([]);
                setItems([]);
                setOwnershipDeptId(null);
                return;
            }
            const matches = mapped.filter(m => String(m.ramco_id) === String(user) && (m.status || 'Active') === 'Active');
            if (!matches.length) {
                // Not a member of criteria ownership -> do not expose criteria
                setRawItems([]);
                setItems([]);
                setOwnershipDeptId(null);
                return;
            }
            // Use the first matching department_id (extend to multi-dept if needed)
            const deptId = Number(matches[0].department_id);
            setOwnershipDeptId(Number.isNaN(deptId) ? null : deptId);
            await fetchCriteria(deptId);
        } catch (e) {
            // On error, stay restrictive (no criteria)
            setRawItems([]);
            setItems([]);
            setOwnershipDeptId(null);
        }
    };

    // Derive current user's allowed departments (active entries)
    const username = (auth?.authData?.user?.username) || ((auth?.authData?.user as any)?.ramco_id) || '';
    const allowedDeptIds = React.useMemo(() => {
        if (!username) return [] as number[];
        const ids = ownershipMap
            .filter(m => String(m.ramco_id) === String(username) && (m.status || 'Active') === 'Active')
            .map(m => Number(m.department_id))
            .filter(n => !Number.isNaN(n));
        return Array.from(new Set(ids));
    }, [ownershipMap, username]);

    // When raw items or ownership changes, set visible items
    useEffect(() => {
        // When rawItems change and no ownership filtering is set via server, keep items in sync
        if (!rawItems.length) return;
        if (!items.length) setItems(rawItems);
    }, [rawItems]);

    // Initialize missing answer keys when items change (without wiping existing answers)
    useEffect(() => {
        if (!items.length) return;
        setAnswers(prev => {
            const next = { ...prev } as Record<string, any>;
            let changed = false;
            items.forEach((it) => {
                const key = String(it.qset_id);
                if (!(key in next)) {
                    // No default; assessor must choose (including explicit N/A where applicable)
                    next[key] = null;
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [items]);

    // fetchVehicles is now handled in fetchAssessedAssetsAndVehicles

    const fetchLocations = async () => {
        try {
            const resp: any = await authenticatedApi.get('/api/assets/locations', {
                params: {
                    classification: 'asset',
                    status: 'active'
                }
            });
            const arr = Array.isArray(resp.data) ? resp.data : (resp.data?.data || []);
            const normalized = arr.map((l: any) => ({
                id: l.id || l.location_id,
                name: l.name || l.location_name || l.description || `Location ${l.id || l.location_id}`,
            }));
            setLocations(normalized);
        } catch (e) {
            toast.error('Failed to fetch locations');
        }
    };

    const fetchAssessmentData = async (id: string) => {
        setLoadingAssessment(true);
        try {
            const resp: any = await authenticatedApi.get(`/api/compliance/assessments/${id}`);
            const data = resp.data?.data;

            if (data) {
                setAssessmentData(data);

                // Populate form fields
                setSelectedVehicle(String(data.asset?.id || ''));
                setSelectedLocation(String(data.assessment_location?.id || ''));

                // Populate answers from details
                const populatedAnswers: Record<string, any> = {};

                data.details.forEach((detail: AssessmentDetail) => {
                    const itemId = detail.adt_item;
                    const rate = parseFloat(detail.adt_rate);
                    const rate2 = Number(detail.adt_rate2);
                    const ncr = Number(detail.adt_ncr);

                    // Set the main answer based on type
                    if (detail.qset_type === 'NCR') {
                        // Prefer explicit NCR flag if available: 1=Comply, 2=Not-comply, 0=N/A
                        if (ncr === 1) populatedAnswers[itemId] = 'Comply';
                        else if (ncr === 2) populatedAnswers[itemId] = 'Not-comply';
                        else populatedAnswers[itemId] = 0; // N/A
                    } else if (detail.qset_type === 'Rating') {
                        // Rating is N/A(0) or 1..4
                        const raw = Number.isNaN(rate) ? 0 : Math.round(rate);
                        const r = Math.max(0, Math.min(4, raw));
                        populatedAnswers[itemId] = r;
                    } else if (detail.qset_type === 'Selection') {
                        // Map adt_rate2 to selection value: 0=N/A, 1=Equipped, 2=Missing
                        if (rate2 === 1) populatedAnswers[itemId] = 'Equipped';
                        else if (rate2 === 2) populatedAnswers[itemId] = 'Missing';
                        else populatedAnswers[itemId] = 0; // N/A
                    }

                    // Set comment if exists
                    if (detail.adt_rem) {
                        populatedAnswers[`comment-${itemId}`] = detail.adt_rem;
                    }
                });

                setAnswers(prev => ({ ...prev, ...populatedAnswers }));

                // Handle existing vehicle images (a_upload*) when editing
                const urls = [data.a_upload, data.a_upload2, data.a_upload3, data.a_upload4]
                    .filter((u: any) => typeof u === 'string' && u.trim().length > 0) as string[];
                setExistingVehicleImageUrls(urls);

                // Ensure all criteria present in the saved assessment are included in `items`
                // This avoids losing criteria on update when current ownership filtering hides some items.
                setItems(prevItems => {
                    try {
                        const present = new Set((prevItems || []).map(i => String(i.qset_id)));
                        const extras = (Array.isArray(data.details) ? data.details : [])
                            .filter((d: any) => !present.has(String(d.adt_item)))
                            .map((d: any, idx: number) => {
                                const t = String(d.qset_type || '').toUpperCase();
                                const normType: any = (t === 'NCR' || t === 'RATING' || t === 'SELECTION') ? t : 'RATING';
                                return {
                                    qset_id: Number(d.adt_item),
                                    qset_quesno: Number(d.adt_item),
                                    qset_desc: d.qset_desc || `Criterion ${d.adt_item}`,
                                    qset_type: normType,
                                    qset_order: (prevItems?.length || 0) + idx + 1,
                                    dept: null,
                                    ownership: null,
                                } as CriteriaItem;
                            });
                        return extras.length ? [...prevItems, ...extras] : prevItems;
                    } catch {
                        return prevItems;
                    }
                });
            }
        } catch (e) {
            toast.error('Failed to load assessment data');
            console.error('Error fetching assessment:', e);
        } finally {
            setLoadingAssessment(false);
        }
    };

    const totalPages = Math.ceil(items.length / PAGE_SIZE);
    const start = page * PAGE_SIZE;
    const pageItems = items.slice(start, start + PAGE_SIZE);

    const setAnswer = (id: number | string, value: any) => {
        const key = String(id);
        setAnswers(prev => ({ ...prev, [key]: value }));
    };

    const setProofFile = (id: number, file: File | null) => {
        const fileKey = `file-${id}`;
        const urlKey = `fileUrl-${id}`;
        // Revoke previous URL if exists
        const prevUrl = answers[urlKey];
        if (prevUrl) URL.revokeObjectURL(prevUrl);
        if (file) {
            const url = URL.createObjectURL(file);
            setAnswers(prev => ({ ...prev, [fileKey]: file, [urlKey]: url }));
            // clear file error if any
            setErrors(prev => ({ ...prev, [fileKey]: '' }));
        } else {
            setAnswers(prev => {
                const next = { ...prev } as Record<string, any>;
                delete next[fileKey];
                delete next[urlKey];
                return next;
            });
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, id: number) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverId(null);
        const dt = e.dataTransfer;
        if (!dt?.files?.length) return;
        const files = dt.files;
        const newFiles: File[] = [];
        const newUrls: string[] = [];
        const currentCount = vehicleImages.length;
        const maxImages = 4;

        Array.from(files).forEach(file => {
            const isImage = /^image\/(png|jpeg)$/i.test(file.type) || /\.(png|jpg|jpeg)$/i.test(file.name);
            if (isImage) {
                if (currentCount + newFiles.length < maxImages) {
                    newFiles.push(file);
                    newUrls.push(URL.createObjectURL(file));
                }
            }
        });

        if (currentCount + newFiles.length > maxImages) {
            toast.error('Maximum 4 vehicle images allowed.');
        }

        if (newFiles.length > 0) {
            setVehicleImages(prev => [...prev, ...newFiles].slice(0, maxImages));
            setVehicleImageUrls(prev => [...prev, ...newUrls].slice(0, maxImages));
        }

        if (newFiles.length !== files.length) {
            toast.error('Some files were skipped. Only PNG/JPG images are allowed.');
        }
    };

    const handleVehicleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length) return;

        const newFiles: File[] = [];
        const newUrls: string[] = [];
        const currentCount = vehicleImages.length;
        const maxImages = 4;

        Array.from(files).forEach(file => {
            const isImage = /^image\/(png|jpeg)$/i.test(file.type) || /\.(png|jpg|jpeg)$/i.test(file.name);
            if (isImage) {
                if (currentCount + newFiles.length < maxImages) {
                    newFiles.push(file);
                    newUrls.push(URL.createObjectURL(file));
                }
            }
        });

        if (currentCount + newFiles.length > maxImages) {
            toast.error('Maximum 4 vehicle images allowed.');
        }

        if (newFiles.length > 0) {
            setVehicleImages(prev => [...prev, ...newFiles].slice(0, maxImages));
            setVehicleImageUrls(prev => [...prev, ...newUrls].slice(0, maxImages));
        }

        if (newFiles.length !== files.length) {
            toast.error('Some files were skipped. Only PNG/JPG images are allowed.');
        }

        // Reset input
        e.target.value = '';
    };

    const removeVehicleImage = (index: number) => {
        // Revoke URL to prevent memory leak
        URL.revokeObjectURL(vehicleImageUrls[index]);
        setVehicleImages(prev => prev.filter((_, i) => i !== index));
        setVehicleImageUrls(prev => prev.filter((_, i) => i !== index));
    };

    // Calculate criteria summary
    const getCriteriaSummary = () => {
        const summary = {
            ncr: { comply: 0, notComply: 0, na: 0, unanswered: 0 },
            rating: { answered: 0, na: 0, unanswered: 0, averageRating: 0, totalRating: 0 },
            selection: { equipped: 0, missing: 0, na: 0, unanswered: 0 }
        } as const as any;

        items.forEach(item => {
            const answer = answers[item.qset_id];

            if (item.qset_type === 'NCR') {
                if (answer === 'Comply') summary.ncr.comply++;
                else if (answer === 'Not-comply') summary.ncr.notComply++;
                else if (answer === 0 || answer === '0') summary.ncr.na++;
                else summary.ncr.unanswered++;
            } else if (item.qset_type === 'Rating') {
                if (answer === 0 || answer === '0') {
                    summary.rating.na++;
                } else {
                    const num = Number(answer);
                    // 1..4 contribute to average
                    if (!Number.isNaN(num) && num >= 1 && num <= 4) {
                        summary.rating.answered++;
                        summary.rating.totalRating += num;
                    } else {
                        summary.rating.unanswered++;
                    }
                }
            } else if (item.qset_type === 'Selection') {
                if (answer === 'Equipped') summary.selection.equipped++;
                else if (answer === 'Missing') summary.selection.missing++;
                else if (answer === 0 || answer === '0') summary.selection.na++;
                else summary.selection.unanswered++;
            }
        });

        if (summary.rating.answered > 0) {
            summary.rating.averageRating = summary.rating.totalRating / summary.rating.answered;
        }

        return summary;
    };

    // Check if all criteria are properly answered
    const isAssessmentComplete = () => {
        if (items.length === 0) return false;

        for (const item of items) {
            const answer = answers[item.qset_id];

            // Check if answer is provided
            if (item.qset_type === 'NCR') {
                // Allow 0 (N/A) in addition to Comply/Not-comply; null/undefined is incomplete
                if (answer !== 'Comply' && answer !== 'Not-comply' && answer !== 0 && answer !== '0') return false;
            } else if (item.qset_type === 'Rating') {
                if (answer == null) return false;
                const num = Number(answer);
                // Allow 0 (N/A) or 1..4 as complete
                if (Number.isNaN(num) || num < 0 || num > 4) return false;
            } else if (item.qset_type === 'Selection') {
                // Allow 0 (N/A) in addition to Equipped/Missing; null/undefined is incomplete
                if (answer !== 'Equipped' && answer !== 'Missing' && answer !== 0 && answer !== '0') return false;
            }

            // Only comment is required if needed
            const needsComment = (
                item.qset_type === 'NCR' && answer === 'Not-comply'
            ) || (
                item.qset_type === 'Rating' && Number(answer) === 1
            ) || (
                item.qset_type === 'Selection' && answer === 'Missing'
            );

            if (needsComment) {
                const comment = answers[`comment-${item.qset_id}`];
                if (!comment || String(comment).trim().length === 0) {
                    return false;
                }
            }
        }
        return true;
    };

    const handleCancel = () => {
        setShowCancelDialog(true);
    };

    const confirmCancel = () => {
        setShowCancelDialog(false);
        router.push('/compliance/assessment');
    };

    const handleNext = () => { if (page < totalPages - 1) setPage(p => p + 1); };
    const handlePrev = () => { if (page > 0) setPage(p => p - 1); };

    const handleSubmit = async () => {
        // Final validation check
        if (!isAssessmentComplete()) {
            toast.error('Please complete all criteria before submitting.');
            return;
        }

        // Prevent multiple rapid clicks
        if (isSubmitting) return;

        // Ensure ownership department has been resolved (required by backend header payload)
        if (!ownershipDeptId || Number.isNaN(Number(ownershipDeptId))) {
            toast.error('Ownership is not set for your account. Please contact the administrator.');
            return;
        }

        // Validate required comment & file when triggered
        const newErrors: Record<string, string> = {};
        let firstInvalidIndex = -1;
        items.forEach((it, idx) => {
            const ans = answers[it.qset_id];
            // Determine if comment is required based on strict value match
            let commentRequired = false;
            if (it.qset_type === 'NCR') {
                commentRequired = (ans === 'Not-comply');
            } else if (it.qset_type === 'Rating') {
                commentRequired = (Number(ans) === 1);
            } else if (it.qset_type === 'Selection') {
                commentRequired = (ans === 'Missing');
            }
            if (commentRequired) {
                const cid = `comment-${it.qset_id}`;
                if (!answers[cid] || String(answers[cid]).trim().length === 0) {
                    newErrors[cid] = 'Comment is required.';
                    if (firstInvalidIndex === -1) firstInvalidIndex = idx;
                }
            }
        });

        if (Object.keys(newErrors).length) {
            setErrors(newErrors);
            // Jump to the page that contains the first invalid item
            if (firstInvalidIndex !== -1) {
                const newPage = Math.floor(firstInvalidIndex / PAGE_SIZE);
                setPage(newPage);
            }
            toast.error('Please complete required comment and proof for highlighted items.');
            return;
        }

        // Prepare assessment details
        const details = items.map((item) => {
            const answer = answers[item.qset_id];
            const comment = answers[`comment-${item.qset_id}`] || '';
            const proofFile = answers[`file-${item.qset_id}`];

            let rate: string = '0';
            let ncr = 0;
            let rate2 = 0;

            if (item.qset_type === 'NCR') {
                // Comply = 1, Not-comply = 2, 0 = N/A
                ncr = (answer === 'Comply' || answer === 1) ? 1 : ((answer === 'Not-comply' || answer === 2) ? 2 : 0);
                // For scoring, keep 5 for comply, 0 otherwise (including N/A)
                rate = (answer === 'Comply' || answer === 1) ? '5' : '0';
            } else if (item.qset_type === 'Rating') {
                // adt_rate: 0 (N/A) or 1..4
                const numeric = typeof answer === 'number' ? answer : parseInt(answer ?? '0', 10);
                rate = String(isNaN(numeric) ? 0 : numeric);
            } else if (item.qset_type === 'Selection') {
                // adt_rate2: 0=N/A, 1=Equipped, 2=Missing
                if (answer === 'Equipped' || answer === 1) {
                    rate2 = 1;
                } else if (answer === 'Missing' || answer === 2) {
                    rate2 = 2;
                } else if (answer === 0 || answer === '0' || String(answer).toLowerCase() === 'n/a') {
                    rate2 = 0;
                }
                // For scoring, treat Equipped as 1, Missing as 0
                rate = rate2 === 1 ? '1' : '0';
            }

            // Final safety: ensure numeric
            if (isNaN(parseFloat(rate))) {
                rate = '0';
            }

            // Only allow 1 proof file per criteria
            let imageName = '';
            if (proofFile instanceof File) imageName = proofFile.name;

            return {
                adt_item: parseInt(String(item.qset_id)),
                adt_rate: rate,
                adt_rate2: rate2,
                adt_rem: comment,
                adt_ncr: ncr,
                adt_image: imageName
            };
        });

        // All-or-nothing safety: ensure details count matches visible criteria count
        const expectedCount = items.length;
        if (details.length !== expectedCount) {
            toast.error('Internal mismatch: criteria count changed during submission. Please try again.');
            return;
        }

        // Calculate overall assessment rate and NCR count
    const totalCriteria = details.length;
    // Count only 'Not-comply' items. adt_ncr: 1=Comply, 2=Not-comply, 0/other=unset
    const totalNCR = details.reduce((count, detail) => (detail.adt_ncr === 2 ? count + 1 : count), 0);
        const totalRate = details.reduce((sum, detail) => {
            const v = parseFloat(detail.adt_rate);
            return sum + (isNaN(v) ? 0 : v);
        }, 0);
        const rawOverall = totalCriteria > 0 ? (totalRate / (totalCriteria * 5)) * 100 : 0;
        const overallRate = isNaN(rawOverall) ? '0.00' : rawOverall.toFixed(2);

        // After validations pass, mark as submitting
        setIsSubmitting(true);

        // Prepare FormData payload
        const formData = new FormData();
        
        // Header information
    formData.append('asset_id', selectedVehicle);
    formData.append('location_id', selectedLocation);
    formData.append('ownership', String(ownershipDeptId));
    // MySQL DATETIME expects 'YYYY-MM-DD HH:MM:SS' (no timezone 'Z'). Using toISOString() caused
    // error: Incorrect datetime value: '2025-09-25T03:11:34.408Z'. Format manually in local time.
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const mysqlDateTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    formData.append('a_date', mysqlDateTime);
        formData.append('a_remark', ''); // General remark if needed
    // Ensure a_rate is a valid decimal string
    formData.append('a_rate', overallRate);
        formData.append('a_ncr', String(totalNCR));
        
        // Vehicle images: map each file to individual a_upload* fields (legacy backend expectation)
        // a_upload  -> first image
        // a_upload2 -> second image
        // a_upload3 -> third image
        // a_upload4 -> fourth image
        const uploadFieldNames = ['a_upload', 'a_upload2', 'a_upload3', 'a_upload4'];
        vehicleImages.slice(0, 4).forEach((file, idx) => {
            const field = uploadFieldNames[idx];
            formData.append(field, file); // Append File directly so backend receives multipart file
        });
        // (Optional) If backend expects empty strings for missing slots, uncomment below:
        // uploadFieldNames.forEach((field, idx) => { if (!vehicleImages[idx]) formData.append(field, ''); });

        // Include details both as JSON and as indexed fields to maximize backend compatibility
        formData.append('details', JSON.stringify(details));
        details.forEach((d, i) => {
            formData.append(`details[${i}][adt_item]`, String(d.adt_item));
            formData.append(`details[${i}][adt_rate]`, String(d.adt_rate));
            formData.append(`details[${i}][adt_rate2]`, String(d.adt_rate2 ?? 0));
            formData.append(`details[${i}][adt_rem]`, String(d.adt_rem || ''));
            formData.append(`details[${i}][adt_ncr]`, String(d.adt_ncr ?? 0));
            formData.append(`details[${i}][adt_image]`, String(d.adt_image || ''));
        });
        // Provide explicit count for backend transactional validation
        formData.append('details_count', String(details.length));

        try {
            // Submit the form data
            const endpoint = isEditing ? `/api/compliance/assessment/${assessmentData?.assess_id}` : '/api/compliance/assessments';
            const method = isEditing ? 'PUT' : 'POST';

            const response = await authenticatedApi.request({
                method,
                url: endpoint,
                data: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            // Notify other tabs/pages to reload assessment-record
            localStorage.setItem('assessment-record-reload', Date.now().toString());

            // Attempt to close the tab (works if opened via window.open)
            window.close();

            // Fallback: if not closed, redirect to assessment-record page
            setTimeout(() => {
                if (!window.closed) {
                    window.location.href = '/compliance/assessment';
                }
            }, 500);

        } catch (error) {
            console.error('Error submitting assessment:', error);
            toast.error('Failed to submit assessment. Please try again.');
        } finally {
            // Re-enable the UI if we are still on this page
            setIsSubmitting(false);
        }
    };

    if (loadingAssessment) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p>Loading assessment data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h2 className="text-xl font-semibold">
                    {isEditing ? `Edit Assessment #${assessmentData?.assess_id || assessmentId}` : 'Assessment Form'}
                </h2>
                {isEditing && assessmentData && (
                    <div className="text-sm text-gray-600 mt-2">
                        <p>Asset: {assessmentData.asset?.register_number}</p>
                        <p>Date: {new Date(assessmentData.a_date).toLocaleString()}</p>
                        <p>Current Rate: {assessmentData.a_rate}%</p>
                    </div>
                )}
            </div>

            {/* Header Section - Vehicle, Location, Images */}
            <div className="p-6 border rounded-lg bg-gray-50 space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Assessment Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
                        <SingleSelect
                            options={vehicles
                                .filter(v => {
                                    // If editing, always include the current vehicle
                                    if (isEditing && assessmentData && v.id === assessmentData.asset?.id) return true;
                                    return !assessedAssetIds.includes(v.id);
                                })
                                .map(v => ({
                                    value: String(v.id),
                                    label: v.register_number + (v.owner?.full_name ? ` - ${v.owner.full_name}` : '')
                                }))}
                            value={selectedVehicle}
                            onValueChange={(value) => {
                                setSelectedVehicle(value);
                                // Auto-populate location from selected vehicle
                                const vehicle = vehicles.find(v => String(v.id) === value);
                                if (vehicle?.location && !selectedLocation) {
                                    setSelectedLocation(String(vehicle.location.id));
                                }
                            }}
                            placeholder="Select vehicle"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <SingleSelect
                            options={locations.map(l => ({ value: String(l.id), label: l.name }))}
                            value={selectedLocation}
                            onValueChange={setSelectedLocation}
                            placeholder="Select location"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Images</label>
                    <div
                        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${vehicleImageDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                            }`}
                        onDragOver={(e) => { e.preventDefault(); setVehicleImageDragOver(true); }}
                        onDragLeave={(e) => { e.preventDefault(); setVehicleImageDragOver(false); }}
                        onDrop={handleVehicleImageDrop}
                    >
                        <input
                            id="vehicle-images"
                            type="file"
                            accept="image/png,image/jpeg"
                            multiple
                            className="hidden"
                            onChange={handleVehicleImageSelect}
                        />
                        <label htmlFor="vehicle-images" className="cursor-pointer">
                            <div className="space-y-2">
                                <div className="text-gray-600">
                                    <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                </div>
                                <div className="text-sm text-gray-600">
                                    <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                                </div>
                                <div className="text-xs text-gray-500">PNG, JPG up to 10MB each</div>
                            </div>
                        </label>
                    </div>

                    {vehicleImages.length > 0 && (
                        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                            {vehicleImages.map((file, index) => (
                                <div key={index} className="relative group">
                                    <img
                                        src={vehicleImageUrls[index]}
                                        alt={`Vehicle ${index + 1}`}
                                        className="w-full h-24 object-cover rounded border"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeVehicleImage(index)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
                                        {file.name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Existing attachments (read-only) */}
                    {existingVehicleImageUrls.length > 0 && (
                        <div className="mt-3">
                            <div className="text-sm font-medium text-gray-700 mb-2">Existing attachments</div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {existingVehicleImageUrls.map((url, idx) => (
                                    <a key={idx} href={url} target="_blank" rel="noreferrer" className="block group">
                                        <div className="relative">
                                            <img src={url} alt={`Attachment ${idx + 1}`} className="w-full h-24 object-cover rounded border" />
                                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] p-1 truncate">
                                                {(() => { try { return decodeURIComponent(url.split('/').pop() || `attachment-${idx+1}`); } catch { return `attachment-${idx+1}`; } })()}
                                            </div>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Assessment Progress */}
                {items.length > 0 && (() => {
                    const summary = getCriteriaSummary();
                    const totalItems = items.length;
                    const answeredItems =
                        summary.ncr.comply + summary.ncr.notComply + summary.ncr.na +
                        summary.rating.answered + summary.rating.na +
                        summary.selection.equipped + summary.selection.missing + summary.selection.na;
                    const progressPercentage = totalItems > 0 ? Math.round((answeredItems / totalItems) * 100) : 0;

                    // Calculate totals for each criteria type
                    const ncrTotal = summary.ncr.comply + summary.ncr.notComply + summary.ncr.na + summary.ncr.unanswered;
                    const ncrAnswered = summary.ncr.comply + summary.ncr.notComply + summary.ncr.na;
                    const ratingTotal = summary.rating.answered + summary.rating.na + summary.rating.unanswered;
                    const ratingAnswered = summary.rating.answered + summary.rating.na;
                    const selectionTotal = summary.selection.equipped + summary.selection.missing + summary.selection.na + summary.selection.unanswered;
                    const selectionAnswered = summary.selection.equipped + summary.selection.missing + summary.selection.na;

                    return (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-md font-medium text-blue-900">Assessment Progress</h4>
                                <div className="text-sm text-blue-700">
                                    {answeredItems}/{totalItems} completed ({progressPercentage}%)
                                </div>
                            </div>

                            <div className="w-full bg-blue-200 rounded-full h-2 mb-3">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progressPercentage}%` }}
                                ></div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                {/* Compliance Summary */}
                                {ncrTotal > 0 && (
                                    <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                                        <div className="font-semibold text-gray-900 mb-3">Compliance</div>
                                        <div className="space-y-0">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-700">Total:</span>
                                                <span className="font-semibold">{ncrAnswered}/{ncrTotal}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-green-600">Comply:</span>
                                                <span className="font-semibold">{summary.ncr.comply}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-red-600">Not-comply:</span>
                                                <span className="font-semibold">{summary.ncr.notComply}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Ratings Summary */}
                                {ratingTotal > 0 && (
                                    <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                                        <div className="font-semibold text-gray-900 mb-3">Ratings</div>
                                        <div className="space-y-0">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-700">Total:</span>
                                                <span className="font-semibold">{ratingAnswered}/{ratingTotal}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-blue-600">Avg Rating:</span>
                                                <span className="font-semibold">{summary.rating.answered > 0 ? summary.rating.averageRating.toFixed(1) : '0.0'}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Selections Summary */}
                                {selectionTotal > 0 && (
                                    <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                                        <div className="font-semibold text-gray-900 mb-3">Selections</div>
                                        <div className="space-y-0">
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-700">Total:</span>
                                                <span className="font-semibold">{selectionAnswered}/{selectionTotal}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-green-600">Equipped:</span>
                                                <span className="font-semibold">{summary.selection.equipped}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-red-600">Missing:</span>
                                                <span className="font-semibold">{summary.selection.missing}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                    <Button
                        onClick={handleCancel}
                        variant="outline"
                        disabled={isSubmitting}
                        className="px-6"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!isAssessmentComplete() || isSubmitting}
                        aria-busy={isSubmitting}
                        className={`px-6 ${isAssessmentComplete() && !isSubmitting ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {isEditing ? 'Updating...' : 'Submitting...'}
                            </>
                        ) : (
                            isAssessmentComplete() ? (isEditing ? 'Update Assessment' : 'Submit Assessment') : 'Complete All Criteria'
                        )}
                    </Button>
                </div>
            </div>

            {/* Separator */}
            <hr className="border-gray-300" />

            {/* Assessment Criteria Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Assessment Criteria</h3>
                    {totalPages > 1 && (
                        <div className="text-sm text-gray-600">
                            Page {page + 1} of {totalPages}
                        </div>
                    )}
                </div>
                {loading && <div className="text-center py-8 text-gray-500">Loading criteria...</div>}
                {!loading && pageItems.length === 0 && (
                    <div className="text-center py-8 text-gray-500">No criteria found.</div>
                )}
                {!loading && pageItems.map((it, idx) => {
                    const currentAnswer = answers[it.qset_id];
                    const needsCommentOrFile = (
                        it.qset_type === 'NCR' && currentAnswer === 'Not-comply'
                    ) || (
                        it.qset_type === 'Rating' && Number(currentAnswer) === 1
                    ) || (
                        it.qset_type === 'Selection' && currentAnswer === 'Missing'
                    );
                    // Highlight unanswered
                    let isUnanswered = false;
                    if (it.qset_type === 'NCR') {
                        // 0 = N/A is considered answered; null/undefined => unanswered
                        isUnanswered = !(currentAnswer === 'Comply' || currentAnswer === 'Not-comply' || currentAnswer === 0 || currentAnswer === '0');
                    } else if (it.qset_type === 'Rating') {
                        if (currentAnswer == null) isUnanswered = true;
                        else {
                            const num = Number(currentAnswer);
                            // 0..4 valid
                            isUnanswered = Number.isNaN(num) || num < 0 || num > 4;
                        }
                    } else if (it.qset_type === 'Selection') {
                        // 0 = N/A is considered answered
                        isUnanswered = !(currentAnswer === 'Equipped' || currentAnswer === 'Missing' || currentAnswer === 0 || currentAnswer === '0');
                    }

                    return (
                        <div key={it.qset_id} className={`p-4 border rounded shadow-sm ${isUnanswered ? 'bg-yellow-100 border-yellow-400' : 'bg-white'}`}>
                            <div className="font-medium mb-2">{start + idx + 1}. {it.qset_desc}</div>
                            <div>
                                {it.qset_type === 'NCR' && (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="flex items-center gap-4">
                                            <button
                                                type="button"
                                            className={`px-2 py-1 text-xs rounded border ${(answers[it.qset_id] === 0 || answers[it.qset_id] === '0') ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                                                onClick={() => setAnswer(it.qset_id, 0)}
                                            >
                                                N/A
                                            </button>
                                            <label className="flex items-center gap-2">
                                                <input type="radio" name={`ncr-${it.qset_id}`} checked={answers[it.qset_id] === 'Comply'} onChange={() => setAnswer(it.qset_id, 'Comply')} />
                                                <span>Comply</span>
                                            </label>
                                            <label className="flex items-center gap-2">
                                                <input type="radio" name={`ncr-${it.qset_id}`} checked={answers[it.qset_id] === 'Not-comply'} onChange={() => setAnswer(it.qset_id, 'Not-comply')} />
                                                <span>Not-comply</span>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {it.qset_type === 'Rating' && (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                            className={`px-2 py-1 text-xs rounded border ${(answers[it.qset_id] === 0 || answers[it.qset_id] === '0') ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                                                onClick={() => setAnswer(it.qset_id, 0)}
                                            >
                                                N/A
                                            </button>
                                            <div className="flex items-center gap-1">
                                                {[1, 2, 3, 4].map(n => {
                                                    const selected = Number(answers[it.qset_id]) >= n;
                                                    return (
                                                        <button
                                                            key={n}
                                                            type="button"
                                                            onClick={() => setAnswer(it.qset_id, n)}
                                                            aria-label={`${n} star`}
                                                            className="focus:outline-none"
                                                        >
                                                            <Star className={`w-6 h-6 ${selected ? 'text-yellow-500 fill-yellow-400' : 'text-gray-300 fill-transparent'}`} />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500 text-center">
                                            1 - Tidak memuaskan, 2 - Memuaskan, 3 - Baik, 4 - Cemerlang
                                        </div>
                                    </div>
                                )}

                                {it.qset_type === 'Selection' && (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                className={`px-2 py-1 text-xs rounded border ${(answers[it.qset_id] === 0 || answers[it.qset_id] === '0') ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                                                onClick={() => setAnswer(it.qset_id, 0)}
                                            >
                                                N/A
                                            </button>
                                            <button
                                                type="button"
                                                className={`px-2 py-1 text-xs rounded border ${answers[it.qset_id] === 'Equipped' ? 'bg-green-600 border-green-600 text-white hover:bg-green-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                                                onClick={() => setAnswer(it.qset_id, 'Equipped')}
                                            >
                                                Equipped
                                            </button>
                                            <button
                                                type="button"
                                                className={`px-2 py-1 text-xs rounded border ${answers[it.qset_id] === 'Missing' ? 'bg-red-600 border-red-600 text-white hover:bg-red-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                                                onClick={() => setAnswer(it.qset_id, 'Missing')}
                                            >
                                                Missing
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {needsCommentOrFile && (
                                    <div className="mt-3 space-y-2">
                                        <label className="block text-sm font-medium">
                                            Comment {((it.qset_type === 'NCR' && currentAnswer === 'Not-comply') || (it.qset_type === 'Rating' && Number(currentAnswer) === 1) || (it.qset_type === 'Selection' && currentAnswer === 'Missing')) ? '(required)' : '(optional)'}
                                        </label>
                                        <Textarea
                                            rows={3}
                                            value={answers[`comment-${it.qset_id}`] || ''}
                                            onChange={e => {
                                                const key = `comment-${it.qset_id}`;
                                                const val = e.target.value;
                                                setAnswers(prev => ({ ...prev, [key]: val }));
                                                // clear error on input
                                                if (val && errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
                                            }}
                                        />
                                        {errors[`comment-${it.qset_id}`] && (
                                            <p className="text-xs text-red-600">{errors[`comment-${it.qset_id}`]}</p>
                                        )}
                                        <div>
                                            <label className="block text-sm font-medium">Upload proof (png, jpg, jpeg) (optional)</label>
                                            <div
                                                className={`mt-1 flex flex-col items-center justify-center rounded-md border-2 border-dashed p-4 text-sm text-gray-600 transition-colors ${dragOverId === it.qset_id ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
                                                onDragOver={(e) => { e.preventDefault(); setDragOverId(it.qset_id); }}
                                                onDragLeave={(e) => { e.preventDefault(); if (dragOverId === it.qset_id) setDragOverId(null); }}
                                                onDrop={(e) => handleDrop(e, it.qset_id)}
                                            >
                                                <input
                                                    id={`file-${it.qset_id}`}
                                                    type="file"
                                                    accept="image/png,image/jpeg"
                                                    className="hidden"
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFileSelect(e, it.qset_id)}
                                                />
                                                <label htmlFor={`file-${it.qset_id}`} className="cursor-pointer rounded bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200">
                                                    Browse
                                                </label>
                                                <span className="mt-1">or drag & drop</span>
                                                {answers[`fileUrl-${it.qset_id}`] && (
                                                    <img src={answers[`fileUrl-${it.qset_id}`]} alt="Proof preview" className="mt-3 h-24 w-auto rounded border object-cover" />
                                                )}
                                                {answers[`file-${it.qset_id}`] && (
                                                    <>
                                                        <div className="mt-1 text-xs text-gray-500">{(answers[`file-${it.qset_id}`] as File).name}</div>
                                                        <button type="button" className="mt-2 text-xs text-red-600 underline" onClick={() => setProofFile(it.qset_id, null)}>Remove</button>
                                                    </>
                                                )}
                                            </div>
                                            {errors[`file-${it.qset_id}`] && (
                                                <p className="mt-1 text-xs text-red-600">{errors[`file-${it.qset_id}`]}</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div>
                        <Button onClick={handlePrev} disabled={page === 0} variant="outline" className="bg-gray-300 hover:bg-gray-400 border-gray-400">
                            Previous
                        </Button>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-600">
                            Page {page + 1} of {totalPages}
                        </div>
                        {page < totalPages - 1 && (
                            <Button onClick={handleNext}>Next</Button>
                        )}
                    </div>
                </div>
            )}

            {/* Cancel Confirmation Dialog */}
            <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Assessment</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to cancel? All unsaved changes will be lost.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Continue Working</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmCancel}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Yes, Cancel
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Success Dialog */}
            <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {isEditing ? 'Assessment Updated' : 'Assessment Submitted'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Your assessment has been {isEditing ? 'updated' : 'submitted'} successfully!
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction
                            onClick={() => {
                                setShowSuccessDialog(false);
                                toast.success(`Assessment ${isEditing ? 'updated' : 'submitted'} successfully!`);
                                router.push('/compliance/assessment');
                            }}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            Back to List
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default AssessmentForm;
