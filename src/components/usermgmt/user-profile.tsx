'use client';

import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AuthContext } from '@/store/AuthContext';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import TrainingPersonalSchedule from '@components/training/training-personal';
import Image from 'next/image';
import { Check, Pencil, X } from 'lucide-react';

const DEFAULT_AVATAR = '/assets/images/profile-34.jpeg';

type Nullable<T> = T | null;

interface EmployeeProfile {
    id: number;
    ramco_id: string;
    full_name: string;
    email: string;
    contact: string | null;
    gender?: string | null;
    dob?: string | null;
    avatar?: string | null;
    hire_date?: string | null;
    resignation_date?: string | null;
    employment_type?: string | null;
    employment_status?: string | null;
    grade?: string | null;
    position?: { id: number; name: string | null } | null;
    department?: { id: number; name: string | null; code?: string | null } | null;
    costcenter?: { id: number; name: string | null } | null;
    location?: { id: number; name: string | null; code?: string | null } | null;
}

const resolveProfileImage = (user: Nullable<{ profile?: any; avatar?: string | null }>) => {
    if (!user) {
        return DEFAULT_AVATAR;
    }
    if (user.avatar) {
        return user.avatar;
    }
    const profile = user.profile ?? {};
    return profile.profileImage || profile.profile_image_url || DEFAULT_AVATAR;
};

const readApiAvatarUrl = (payload: any): string | undefined => {
    if (!payload) return undefined;
    if (typeof payload === 'string') {
        return payload;
    }

    return (
        payload.avatar_url ||
        payload.profile_image_url ||
        payload.profileImage ||
        payload.profile_image ||
        payload.url ||
        payload.location
    );
};

const formatLastActivity = (value: string | null | undefined) => {
    if (!value) return '—';
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleString();
    }
    return value;
};

const formatDateValue = (value?: string | null) => {
    if (!value) return '—';
    if (value.startsWith('1899') || value.startsWith('0000')) return '—';
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString();
    }
    return value;
};

const UserProfile: React.FC<React.PropsWithChildren> = ({ children }) => {
    const authContext = useContext(AuthContext);

    if (!authContext) {
        throw new Error('AuthContext is not provided. Ensure UserProfile is rendered within AuthProvider.');
    }

    const { authData, setAuthData } = authContext;
    const user = authData?.user ?? null;
    const usergroups = authData?.usergroups ?? [];

    const [activeTab, setActiveTab] = useState<string>('profile');
    const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
    const [employeeLoading, setEmployeeLoading] = useState(false);
    const [employeeError, setEmployeeError] = useState<string | null>(null);
    const [contactDraft, setContactDraft] = useState<string>('');
    const [contactSaving, setContactSaving] = useState(false);
    const [isEditingContact, setIsEditingContact] = useState(false);

    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const objectUrlRef = useRef<string | null>(null);
    const contactInputRef = useRef<HTMLInputElement | null>(null);

    const currentAvatar = useMemo(() => resolveProfileImage(user), [user]);
    const [avatarPreview, setAvatarPreview] = useState<string>(currentAvatar);

    useEffect(() => {
        setAvatarPreview(currentAvatar);
    }, [currentAvatar]);

    useEffect(
        () => () => {
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
            }
        },
        []
    );

    const username = user?.username ?? '';

    useEffect(() => {
        if (!username) {
            setEmployee(null);
            setEmployeeError(null);
            setIsEditingContact(false);
            return;
        }

        let isActive = true;
        setEmployeeLoading(true);
        setEmployeeError(null);

        (async () => {
            try {
                const response = await authenticatedApi.get(`/api/assets/employees?ramco=${encodeURIComponent(username)}`);
                const payload = (response as any)?.data;
                const items = payload?.data ?? payload;
                const first = Array.isArray(items) ? items[0] : items;
                if (!isActive) return;
                setEmployee(first ? (first as EmployeeProfile) : null);
                setIsEditingContact(false);
            } catch (error) {
                if (!isActive) return;
                setEmployee(null);
                setEmployeeError('Unable to load employee details. Try again later.');
                setIsEditingContact(false);
            } finally {
                if (isActive) setEmployeeLoading(false);
            }
        })();

        return () => {
            isActive = false;
        };
    }, [username]);

    const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }
        if (!file.type.startsWith('image/')) {
            toast.error('Please choose a valid image file.');
            return;
        }
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
        }
        const previewUrl = URL.createObjectURL(file);
        objectUrlRef.current = previewUrl;
        setAvatarFile(file);
        setAvatarPreview(previewUrl);
    };

    const resetAvatarSelection = () => {
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
        setAvatarFile(null);
        setAvatarPreview(currentAvatar);
    };

    const handleAvatarUpload = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!avatarFile) {
            toast.error('Select an image before uploading.');
            return;
        }

        if (!user || !authData) {
            toast.error('Profile data is not available.');
            resetAvatarSelection();
            return;
        }

        const formData = new FormData();
        formData.append('avatar', avatarFile);
        formData.append('user_id', String(user.id));

        setIsUploading(true);
        try {
            const response = await authenticatedApi.put(`/api/users/${user.id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const respData = (response as any)?.data;
            const nextAvatar =
                readApiAvatarUrl(respData?.data) ??
                readApiAvatarUrl(respData) ??
                avatarPreview;

            if (nextAvatar) {
                const updatedProfile = {
                    ...(user.profile ?? {}),
                    profile_image_url: nextAvatar,
                    profileImage: nextAvatar,
                };

                setAuthData({
                    ...authData,
                    user: {
                        ...user,
                        avatar: nextAvatar,
                        profile: updatedProfile,
                    },
                });

                setAvatarPreview(nextAvatar);
                if (objectUrlRef.current) {
                    URL.revokeObjectURL(objectUrlRef.current);
                    objectUrlRef.current = null;
                }
                setAvatarFile(null);
            }

            toast.success('Avatar updated successfully.');
        } catch (error: any) {
            console.error('Failed to upload avatar', error);
            const message =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                'Unable to upload avatar. Please try again.';
            toast.error(message);
            setAvatarPreview(currentAvatar);
        } finally {
            setIsUploading(false);
        }
    };

    const contactValue = user ? (employee?.contact ?? user.contact ?? '') : '';
    const contactDisplay = contactValue || '—';

    useEffect(() => {
        if (!user) return;
        if (isEditingContact) return;
        setContactDraft(contactValue);
    }, [contactValue, isEditingContact, user]);

    const resetContact = () => {
        setContactDraft(contactValue);
        setIsEditingContact(false);
    };

    const contactChanged = useMemo(() => !!employee && contactDraft !== (employee.contact ?? ''), [contactDraft, employee]);

    const buildEmployeeUpdatePayload = (_emp: EmployeeProfile, contactValue: string) => ({
        contact: contactValue,
    });

    const handleContactSave = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!employee) {
            toast.error('Employee profile is not available.');
            return;
        }
        if (!authData) {
            toast.error('Authentication context is missing.');
            return;
        }
        if (!contactChanged) {
            toast.info('No changes to save.');
            return;
        }

        setContactSaving(true);
        try {
            await authenticatedApi.put(`/api/assets/employees/${employee.id}`, buildEmployeeUpdatePayload(employee, contactDraft));
            setEmployee((prev) => (prev ? { ...prev, contact: contactDraft } : prev));
            setAuthData(
                user
                    ? {
                          ...authData,
                          user: {
                              ...user,
                              contact: contactDraft,
                          },
                      }
                    : authData
            );
            toast.success('Contact number updated.');
            setIsEditingContact(false);
        } catch (error: any) {
            console.error('Failed to update contact', error);
            const message =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                'Unable to update contact. Please try again.';
            toast.error(message);
            resetContact();
        } finally {
            setContactSaving(false);
        }
    };

    const overviewRows = useMemo(
        () => {
            if (!user) {
                return [];
            }
            return [
                { label: 'Full Name', value: employee?.full_name || user.name || user.username },
                { label: 'Staff ID', value: employee?.ramco_id || user.username },
                { label: 'Email', value: employee?.email || user.email },
                {
                    label: 'Department',
                    value: employee?.department ? `${employee.department.name}${employee.department.code ? ` (${employee.department.code})` : ''}` : '—',
                },
                { label: 'Position', value: employee?.position?.name || '—' },
                { label: 'Cost Center', value: employee?.costcenter?.name || '—' },
                { label: 'Location', value: employee?.location ? `${employee.location.name}${employee.location.code ? ` (${employee.location.code})` : ''}` : '—' },
                { label: 'Employment Type', value: employee?.employment_type || '—' },
                { label: 'Employment Status', value: employee?.employment_status || '—' },
                { label: 'Grade', value: employee?.grade || '—' },
                { label: 'Hire Date', value: formatDateValue(employee?.hire_date) },
                { label: 'Resignation Date', value: formatDateValue(employee?.resignation_date) },
                { label: 'Role', value: user.role?.name || '—' },
                { label: 'Last Navigation', value: formatLastActivity(user.lastNav) },
            ];
        },
        [employee, user]
    );

    if (!user) {
        return <div className="rounded-md bg-slate-100 p-4 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">Profile information is not available.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="panel">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="w-full justify-start overflow-x-auto">
                        <TabsTrigger value="profile">Profile Overview</TabsTrigger>
                        <TabsTrigger value="training">Training Records</TabsTrigger>
                    </TabsList>
                    <TabsContent value="profile" className="mt-6 space-y-8">
                        <div className="flex flex-col gap-8 lg:flex-row">
                            <div className="flex flex-col items-center gap-4 text-center lg:w-60">
                                <div className="relative h-32 w-32 overflow-hidden rounded-full border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                    <Image
                                        src={avatarPreview}
                                        alt={`${user.name || user.username} avatar`}
                                        fill
                                        className="object-cover"
                                        sizes="128px"
                                        unoptimized
                                    />
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Recommended format: JPG or PNG, max size 4MB.</p>
                                <form onSubmit={handleAvatarUpload} className="flex w-full flex-col gap-3 text-left">
                                    <div className="space-y-2">
                                        <Label htmlFor="avatar-upload">Upload a new avatar</Label>
                                        <Input id="avatar-upload" type="file" accept="image/*" capture="environment" onChange={handleAvatarChange} />
                                    </div>
                                    <div className="flex flex-wrap items-center justify-center gap-3">
                                        <Button type="submit" disabled={isUploading} className="min-w-[120px]">
                                            {isUploading ? 'Uploading…' : 'Update Avatar'}
                                        </Button>
                                        <Button type="button" variant="outline" onClick={resetAvatarSelection} disabled={isUploading || !avatarFile}>
                                            Cancel
                                        </Button>
                                    </div>
                                </form>
                            </div>
                            <div className="flex-1">
                                {employeeLoading ? (
                                    <div className="animate-pulse rounded-lg bg-slate-100 p-4 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                                        Loading employee details…
                                    </div>
                                ) : (
                                    <>
                                        {employeeError && (
                                            <div className="mb-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                                                {employeeError}
                                            </div>
                                        )}
                                        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                                            {overviewRows.map((row) => (
                                                <div key={row.label} className="space-y-1 border-b border-slate-200 pb-3 last:border-b-0 dark:border-slate-800">
                                                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">{row.label}</dt>
                                                    <dd className="truncate text-sm font-medium text-slate-900 dark:text-white">{row.value || '—'}</dd>
                                                </div>
                                            ))}
                                            <div className="space-y-1 border-b border-slate-200 pb-3 last:border-b-0 dark:border-slate-800">
                                                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Contact Number</dt>
                                                <dd className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                                                    {isEditingContact ? (
                                                        <form onSubmit={handleContactSave} className="flex flex-wrap items-center gap-2">
                                                            <Input
                                                                ref={contactInputRef}
                                                                value={contactDraft}
                                                                onChange={(event) => setContactDraft(event.target.value)}
                                                                className="h-9 w-48 sm:w-56"
                                                                placeholder="Enter contact number"
                                                                disabled={contactSaving}
                                                            />
                                                            <Button type="submit" size="sm" disabled={contactSaving || !contactChanged}>
                                                                {contactSaving ? (
                                                                    'Saving…'
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1">
                                                                        <Check className="h-4 w-4" /> Save
                                                                    </span>
                                                                )}
                                                            </Button>
                                                            <Button type="button" size="sm" variant="outline" onClick={resetContact} disabled={contactSaving}>
                                                                <span className="inline-flex items-center gap-1">
                                                                    <X className="h-4 w-4" /> Cancel
                                                                </span>
                                                            </Button>
                                                        </form>
                                                    ) : (
                                                        <>
                                                            <span>{contactDisplay}</span>
                                                            <button
                                                                type="button"
                                                                className="text-slate-500 transition hover:text-primary disabled:opacity-40"
                                                                onClick={() => {
                                                                    if (!employee) return;
                                                                    setIsEditingContact(true);
                                                                    setTimeout(() => contactInputRef.current?.focus(), 0);
                                                                }}
                                                                disabled={!employee}
                                                                aria-label="Edit contact number"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </dd>
                                            </div>
                                        </dl>
                                        {!employee && !employeeError && (
                                            <div className="mt-4 rounded-md bg-slate-100 px-4 py-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                                                No employee record was found for the logged in user.
                                            </div>
                                        )}
                                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Only your contact number can be updated from this screen.</p>
                                    </>
                                )}
                            </div>
                        </div>
                        <div>
                            <div className="mb-3">
                                <h6 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Groups &amp; Permissions</h6>
                                <p className="text-xs text-slate-500 dark:text-slate-400">These groups are provided by the AuthContext on login.</p>
                            </div>
                            {usergroups?.length ? (
                                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {usergroups.map((group) => (
                                        <li
                                            key={group.id}
                                            className="rounded-md border border-slate-200/80 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                                        >
                                            {group.name}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="rounded-md bg-slate-100 px-4 py-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                                    No user groups were associated with this account.
                                </div>
                            )}
                        </div>
                    </TabsContent>
                    <TabsContent value="training" className="mt-6 space-y-6">
                        <TrainingPersonalSchedule />
                        {children ? <div className="space-y-4">{children}</div> : null}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default UserProfile;
