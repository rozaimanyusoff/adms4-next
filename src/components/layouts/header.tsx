'use client';
import { useEffect, useState, useContext, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import { IRootState } from '@/store';
import { toggleTheme, toggleSidebar, toggleRTL } from '@/store/themeConfigSlice';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import IconMenu from '@/components/icon/icon-menu';
import IconCalendar from '@/components/icon/icon-calendar';
import IconEdit from '@/components/icon/icon-edit';
import IconChatNotification from '@/components/icon/icon-chat-notification';
import IconSearch from '@/components/icon/icon-search';
import IconXCircle from '@/components/icon/icon-x-circle';
import IconSun from '@/components/icon/icon-sun';
import IconMoon from '@/components/icon/icon-moon';
import IconLaptop from '@/components/icon/icon-laptop';
import IconMailDot from '@/components/icon/icon-mail-dot';
import IconArrowLeft from '@/components/icon/icon-arrow-left';
import IconInfoCircle from '@/components/icon/icon-info-circle';
import IconBellBing from '@/components/icon/icon-bell-bing';
import IconUser from '@/components/icon/icon-user';
import IconMail from '@/components/icon/icon-mail';
import IconLockDots from '@/components/icon/icon-lock-dots';
import IconLogout from '@/components/icon/icon-logout';
import IconMenuDashboard from '@/components/icon/menu/icon-menu-dashboard';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconMenuApps from '@/components/icon/menu/icon-menu-apps';
import IconMenuComponents from '@/components/icon/menu/icon-menu-components';
import IconMenuElements from '@/components/icon/menu/icon-menu-elements';
import IconMenuDatatables from '@/components/icon/menu/icon-menu-datatables';
import IconMenuForms from '@/components/icon/menu/icon-menu-forms';
import IconMenuPages from '@/components/icon/menu/icon-menu-pages';
import IconMenuMore from '@/components/icon/menu/icon-menu-more';
import IconSettings from '@components/icon/icon-settings';
import CustomSidebar from './SettingSidebar';
import Setting from './setting';
import { usePathname } from 'next/navigation';
import { AuthContext } from '@store/AuthContext'; // Ensure correct typing for AuthContext
import { io } from 'socket.io-client';
import { authenticatedApi } from '@/config/api';
import { useTextSize } from '@/contexts/text-size-context';

// Define Notification type
const DEFAULT_AVATAR = '/assets/images/user-profile.jpeg';

const resolveAvatarSrc = (value?: string | null) => {
    if (!value) return DEFAULT_AVATAR;
    if (typeof value !== 'string') return DEFAULT_AVATAR;
    if (value.startsWith('http') || value.startsWith('/')) return value;
    return `/assets/images/${value}`;
};

interface Notification {
    id: number;
    profile: string; // resolved avatar reference
    message: string;
    time: string; // ISO string or relative placeholder
    title?: string;
    read?: boolean; // backend-provided or locally managed
}

const Header = () => {
    const pathname = usePathname();
    const authContext = useContext(AuthContext);
    if (!authContext) {
        throw new Error('AuthContext is not provided. Ensure the component is wrapped in an AuthProvider.');
    }
    const { authData } = authContext; // Safely access authData
    const { textSize, setTextSize, textSizeClasses } = useTextSize();
    const [navTree, setNavTree] = useState<any[]>([]);
    const dispatch = useDispatch();
    const [isCustomSidebarOpen, setCustomSidebarOpen] = useState(false);

    useEffect(() => {
        if (authData?.navTree) {
            const filteredNavTree = authData.navTree.filter(item => item.status !== 0);
            setNavTree(filteredNavTree); // Set navTree excluding items with status = 0
        }
    }, [authData]);

    useEffect(() => {
        const selector = document.querySelector('ul.horizontal-menu a[href="' + window.location.pathname + '"]');
        if (selector) {
            const all: any = document.querySelectorAll('ul.horizontal-menu .nav-link.active');
            for (let i = 0; i < all.length; i++) {
                all[0]?.classList.remove('active');
            }

            let allLinks = document.querySelectorAll('ul.horizontal-menu a.active');
            for (let i = 0; i < allLinks.length; i++) {
                const element = allLinks[i];
                element?.classList.remove('active');
            }
            selector?.classList.add('active');

            const ul: any = selector.closest('ul.sub-menu');
            if (ul) {
                let ele: any = ul.closest('li.menu').querySelectorAll('.nav-link');
                if (ele) {
                    ele = ele[0];
                    setTimeout(() => {
                        ele?.classList.add('active');
                    });
                }
            }
        }
    }, [pathname]);

    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl';

    const themeConfig = useSelector((state: IRootState) => state.themeConfig);

    const userAvatar = resolveAvatarSrc(authData?.user?.avatar || authData?.user?.profile?.profileImage || authData?.user?.profile?.profile_image_url);
    const userDisplayName = authData?.user?.name || authData?.user?.username || 'User';
    const userEmail = authData?.user?.email || '';

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [loadingNotifications, setLoadingNotifications] = useState(false);
    const [notifError, setNotifError] = useState<string | null>(null);
    const [viewingUserId, setViewingUserId] = useState<number | null>(null); // null = self (no forced param)
    const [metaTargetUserId, setMetaTargetUserId] = useState<number | null>(null);
    const [realtimeEnabled, setRealtimeEnabled] = useState(true); // allow pausing live feed
    const MAX_NOTIFICATIONS = 50;
    const notificationSigSetRef = useRef<Set<string>>(new Set());
    const targetUserInputRef = useRef<HTMLInputElement | null>(null);
    const selfUserId = authData?.user?.id;

    const mapServerNotification = useCallback((n: any): Notification => ({
        id: Number(n.id ?? Date.now()),
        profile: resolveAvatarSrc(n.profile || n.avatar || userAvatar),
        message: n.message || n.title || 'Notification',
        time: n.time || n.created_at || new Date().toISOString(),
        title: n.title,
        read: !!n.read,
    }), [userAvatar]);

    // Treat role id 1 (Admin) and 8 (Developer) as privileged for cross-user view
    const isPrivilegedRole = (roleId?: number) => roleId != null && [1,8].includes(roleId);

    const loadNotifications = useCallback(async (targetUser?: number) => {
        if (!authData) return;
        setLoadingNotifications(true);
        setNotifError(null);
        try {
            const isAdmin = isPrivilegedRole(authData?.user?.role?.id);
            // For admins: if they supplied any numeric targetUser (>=1 or even 0), append user_id param (including self) so backend variant is exercised.
            const hasExplicitTarget = typeof targetUser === 'number' && !Number.isNaN(targetUser);
            const useForeign = isAdmin && hasExplicitTarget;
            const endpoint = useForeign ? `/api/notifications?user_id=${targetUser}` : '/api/notifications';
            const res = await authenticatedApi.get<any>(endpoint);
            // Expected shape: { status: 'success', data: [...] , meta?: { targetUserId }} OR array fallback
            const raw: any = res.data as any;
            const candidate = Array.isArray(raw?.data) ? raw.data
                : Array.isArray(raw?.notifications) ? raw.notifications
                : Array.isArray(raw?.results) ? raw.results
                : Array.isArray(raw?.rows) ? raw.rows
                : Array.isArray(raw) ? raw
                : [];
            const list: any[] = candidate;
            const mapped: Notification[] = list.map(mapServerNotification).sort((a: Notification, b: Notification) => new Date(b.time).getTime() - new Date(a.time).getTime());
            setNotifications(mapped);
            setViewingUserId(useForeign ? targetUser! : null);
            setMetaTargetUserId(raw?.meta?.targetUserId ?? (useForeign ? targetUser! : null));
            // Debug logging (non-intrusive)
             
            console.debug('[Notifications] load ok -> endpoint:', endpoint, '| items:', mapped.length, '| viewingUserId:', viewingUserId, '| meta.targetUserId:', raw?.meta?.targetUserId);
            // Don't alter unreadCount here for foreign view: unreadCount remains for self
        } catch (e: any) {
            if (e?.response?.status === 403) {
                setNotifError('Forbidden: only admins can view other users\' notifications');
                setViewingUserId(null);
                setMetaTargetUserId(null);
            } else {
                setNotifError(e?.response?.data?.message || 'Failed to load notifications');
            }
             
            console.error('[Notifications] load failed', e);
        } finally {
            setLoadingNotifications(false);
        }
    }, [authData, mapServerNotification, viewingUserId]);

    const loadUnreadCount = useCallback(async () => {
        if (!authData) return;
        try {
            const res = await authenticatedApi.get<any>('/api/notifications/unread-count');
            const raw: any = res.data as any;
            const count = raw?.count ?? raw?.data?.count ?? raw?.data?.unread ?? 0;
            setUnreadCount(Number(count) || 0);
        } catch {
            // Silent fail; keep existing count
        }
    }, [authData]);

    const markNotificationRead = useCallback(async (id: number) => {
        // Optimistic UI
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(c => (c > 0 ? c - 1 : 0));
        try {
            await authenticatedApi.post('/api/notifications/mark-read', { id });
        } catch {
            // rollback on failure (optional)
        }
    }, []);

    const markAllRead = useCallback(async () => {
        // Optimistic
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
        try {
            await authenticatedApi.post('/api/notifications/mark-all-read');
        } catch {
            // ignore for now
        }
    }, []);

    // Initial load from backend
    useEffect(() => {
        if (authData?.user) {
            loadNotifications();
            loadUnreadCount();
        }
    }, [authData?.user, loadNotifications, loadUnreadCount]);

    // Real-time notifications via socket
    useEffect(() => {
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
        const socket = io(socketUrl, { transports: ['websocket'] });
        socket.on('notification', (data) => {
            if (!realtimeEnabled) return;
            if (isPrivilegedRole(authData?.user?.role?.id)) {
                const signature = `${data.message || data.title || ''}::${data.time || ''}`;
                if (notificationSigSetRef.current.has(signature)) return; // duplicate skip
                notificationSigSetRef.current.add(signature);
                setNotifications(prev => {
                    const incoming: Notification = mapServerNotification({ ...data, id: Date.now() });
                    const next = [incoming, ...prev];
                    if (next.length > MAX_NOTIFICATIONS) {
                        // Trim excess & rebuild signature set to keep memory bounded
                        const trimmed = next.slice(0, MAX_NOTIFICATIONS);
                        notificationSigSetRef.current = new Set(trimmed.map(n => `${n.message || ''}::${n.time || ''}`));
                        return trimmed;
                    }
                    return next;
                });
                setUnreadCount(c => c + 1);
            }
        });
        return () => { socket.disconnect(); };
    }, [authData?.user?.role?.id, mapServerNotification, realtimeEnabled]);

    const removeNotification = (value: number) => {
        // Interpret removal as mark read locally
        const target = notifications.find(n => n.id === value);
        if (target && !target.read) {
            markNotificationRead(value);
        } else {
            setNotifications(prev => prev.filter(n => n.id !== value));
        }
    };

    const [search, setSearch] = useState(false);

    const renderMenuItems = (items: any[]) => {
        return items.map((item) => {
            if (item.type === 'section') {
                return (
                    <li key={item.navId} className="menu nav-item relative">
                        <Button type="button" variant="ghost" className="nav-link">
                            <div className="flex items-center">
                                <span className="px-1">{item.title}</span>
                            </div>
                            <div className="right_arrow">
                                <IconCaretDown />
                            </div>
                        </Button>
                        {item.children && item.children.length > 0 && (
                            <ul className="sub-menu">
                                {renderMenuItems(item.children)}
                            </ul>
                        )}
                    </li>
                );
            }

            if (item.type === 'level-1' || item.type === 'level-2') {
                return (
                    <li key={item.navId} className="menu nav-item relative">
                        <Link href={item.path || '#'} className="nav-link">
                            {item.title}
                        </Link>
                    </li>
                );
            }

            return null;
        });
    };

    const handleLogout = async () => {
        console.log('🚪 Starting logout process...');
        const token = authData?.token || JSON.parse(localStorage.getItem('authData') || '{}').token;
        const rememberedCredentials = localStorage.getItem('rememberedCredentials');
        console.log('💾 Preserving remembered credentials:', rememberedCredentials ? 'Yes' : 'No');

        try {
            await authenticatedApi.post('/api/auth/logout', undefined, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
        } catch (e) {
            // Optionally handle error
        } finally {
            // Only clear after the logout request resolves/rejects
            localStorage.clear();
            console.log('🧹 localStorage cleared');

            if (rememberedCredentials) {
                localStorage.setItem('rememberedCredentials', rememberedCredentials);
                console.log('✅ Remembered credentials restored');
            }
        }
        
        window.location.href = '/auth/login';
    };

    return (
        <header className={`z-40 ${themeConfig.semidark && themeConfig.menu === 'horizontal' ? 'dark' : ''}`}>
            <div className="shadow-xs">
                <div className="relative flex w-full items-center bg-white px-4 py-1.5 dark:bg-black">
                    <div className="horizontal-logo flex items-center justify-between gap-4 ltr:mr-2 rtl:ml-2 lg:hidden">
                        <Link href="/" className="main-logo flex shrink-0 items-center gap-4">
                            <img className="inline w-8 ltr:-ml-1 rtl:-mr-1" src={`${themeConfig.isDarkMode ? process.env.NEXT_PUBLIC_BRAND_LOGO_DARK : process.env.NEXT_PUBLIC_BRAND_LOGO_LIGHT}`} alt="logo" />
                            <span className={`hidden ${textSizeClasses.heading} text-shadow-2xs font-extrabold  transition-all duration-300 ltr:ml-1.5 rtl:mr-1.5 dark:text-white-light md:inline`}>{process.env.NEXT_PUBLIC_APP_NAME}</span>
                        </Link>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="collapse-icon flex flex-none hover:bg-white-light/90 hover:text-primary ltr:ml-2 rtl:mr-2 dark:bg-dark/40 dark:text-[#d0d2d6] dark:hover:bg-dark/60 dark:hover:text-primary lg:hidden"
                            onClick={() => dispatch(toggleSidebar())}
                        >
                            <IconMenu className="h-7 w-7 text-orange-600" />
                        </Button>
                    </div>

                    <div className="flex items-center justify-end space-x-1.5 ltr:ml-auto rtl:mr-auto rtl:space-x-reverse dark:text-[#d0d2d6] sm:flex-1 sm:ltr:ml-0 sm:rtl:mr-0 lg:space-x-2">
                        {/* <div className="sm:ltr:mr-auto sm:rtl:ml-auto">
                            <form
                                className={`${search && 'block!'} absolute inset-x-0 top-1/2 z-10 mx-4 hidden -translate-y-1/2 sm:relative sm:top-0 sm:mx-0 sm:block sm:translate-y-0`}
                                onSubmit={() => setSearch(false)}
                            >
                                <div className="relative">
                                    <input
                                        type="text"
                                        className="peer form-input bg-gray-100 placeholder:tracking-widest ltr:pl-9 ltr:pr-9 rtl:pl-9 rtl:pr-9 sm:bg-transparent sm:ltr:pr-4 sm:rtl:pl-4"
                                        placeholder="Search..."
                                    />
                                    <button type="button" className="absolute inset-0 h-9 w-9 appearance-none peer-focus:text-primary ltr:right-auto rtl:left-auto">
                                        <IconSearch className="mx-auto" />
                                    </button>
                                    <button type="button" className="absolute top-1/2 block -translate-y-1/2 hover:opacity-80 ltr:right-2 rtl:left-2 sm:hidden" onClick={() => setSearch(false)}>
                                        <IconXCircle />
                                    </button>
                                </div>
                            </form>
                            <button
                                type="button"
                                onClick={() => setSearch(!search)}
                                className="search_btn rounded-full bg-white-light/40 p-2 hover:bg-white-light/90 dark:bg-dark/40 dark:hover:bg-dark/60 sm:hidden"
                            >
                                <IconSearch className="mx-auto h-4.5 w-4.5 dark:text-[#d0d2d6]" />
                            </button>
                        </div> */}
                        <div className="flex items-center shrink-0">
                            <div className="flex items-center bg-white-light/40 dark:bg-dark/40 rounded-full p-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white-light/90 dark:hover:bg-dark/60 hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => {
                                        const sizes: Array<'xs' | 'sm' | 'md' | 'lg' | 'xl'> = ['xs', 'sm', 'md', 'lg', 'xl'];
                                        const currentIndex = sizes.indexOf(textSize);
                                        if (currentIndex > 0) {
                                            setTextSize(sizes[currentIndex - 1]);
                                        }
                                    }}
                                    disabled={textSize === 'xs'}
                                >
                                    <span className="text-lg font-bold">-</span>
                                </Button>
                                <div className="flex items-center px-2 min-w-10 justify-center">
                                    <span className="text-sm font-semibold">T</span>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white-light/90 dark:hover:bg-dark/60 hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => {
                                        const sizes: Array<'xs' | 'sm' | 'md' | 'lg' | 'xl'> = ['xs', 'sm', 'md', 'lg', 'xl'];
                                        const currentIndex = sizes.indexOf(textSize);
                                        if (currentIndex < sizes.length - 1) {
                                            setTextSize(sizes[currentIndex + 1]);
                                        }
                                    }}
                                    disabled={textSize === 'xl'}
                                >
                                    <span className="text-lg font-bold">+</span>
                                </Button>
                            </div>
                        </div>
                        <div>
                            {themeConfig.theme === 'light' ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className={`${themeConfig.theme === 'light' &&
                                        'flex items-center rounded-full bg-white-light/40 p-2 hover:bg-white-light/90 hover:text-primary dark:bg-dark/40 dark:hover:bg-dark/60'
                                        }`}
                                    onClick={() => dispatch(toggleTheme('dark'))}
                                >
                                    <IconSun />
                                </Button>
                            ) : (
                                ''
                            )}
                            {themeConfig.theme === 'dark' && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className={`${themeConfig.theme === 'dark' &&
                                        'flex items-center rounded-full bg-white-light/40 p-2 hover:bg-white-light/90 hover:text-primary dark:bg-dark/40 dark:hover:bg-dark/60'
                                        }`}
                                    onClick={() => dispatch(toggleTheme('system'))}
                                >
                                    <IconMoon />
                                </Button>
                            )}
                            {themeConfig.theme === 'system' && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className={`${themeConfig.theme === 'system' &&
                                        'flex items-center rounded-full bg-white-light/40 p-2 hover:bg-white-light/90 hover:text-primary dark:bg-dark/40 dark:hover:bg-dark/60'
                                        }`}
                                    onClick={() => dispatch(toggleTheme('light'))}
                                >
                                    <IconLaptop />
                                </Button>
                            )}
                        </div>
                        <div className="dropdown shrink-0">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="relative block p-2 rounded-full bg-white-light/40 dark:bg-dark/40 hover:text-primary hover:bg-white-light/90 dark:hover:bg-dark/60"
                                    >
                                        <span>
                                            <IconBellBing />
                                            {unreadCount > 0 && (
                                                <span className="absolute top-0 flex h-3 w-3 ltr:right-0 rtl:left-0">
                                                    <span className="absolute -top-0.75 inline-flex h-full w-full animate-ping rounded-full bg-success/50 opacity-75 ltr:-left-0.75 rtl:-right-0.75"></span>
                                                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success"></span>
                                                </span>
                                            )}
                                        </span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align={isRtl ? 'start' : 'end'}
                                    side="bottom"
                                    sideOffset={8}
                                    className="p-0"
                                >
                                    <ul className="w-75 divide-y py-0! text-dark dark:divide-white/10 dark:text-white-dark sm:w-87.5">
                                    <li onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-between px-4 py-2 font-semibold">
                                            <h4 className={textSizeClasses.heading}>Notifications</h4>
                                            {unreadCount > 0 && <span className="badge bg-primary/80">{unreadCount} New</span>}
                                        </div>
                                    </li>
                                    {isPrivilegedRole(authData?.user?.role?.id) && (
                                        <li onClick={(e)=> e.stopPropagation()} className="px-4 pt-2 pb-1 text-xs flex flex-col gap-2 bg-slate-50 dark:bg-slate-800/40">
                                            <form
                                                className="flex items-center gap-2"
                                                onSubmit={(e)=>{
                                                    e.preventDefault();
                                                    const rawVal = targetUserInputRef.current?.value?.trim();
                                                    if (!rawVal) return;
                                                    const val = Number(rawVal);
                                                    if (!Number.isNaN(val)) {
                                                         
                                                        console.debug('[Notifications] submit load targetUserId:', val);
                                                        loadNotifications(val);
                                                    }
                                                }}
                                            >
                                                <Input
                                                    ref={targetUserInputRef}
                                                    type="number"
                                                    min={1}
                                                    placeholder="User ID"
                                                    className="form-input h-7 w-28 px-2 py-1 text-xs"
                                                />
                                                <Button
                                                    type="submit"
                                                    variant="secondary"
                                                    size="sm"
                                                    className="btn btn-secondary btn-xs h-7 px-3"
                                                    onClick={(e)=>{
                                                        // Redundant safety to ensure click triggers same logic
                                                        const rawVal = targetUserInputRef.current?.value?.trim();
                                                        if (!rawVal) return;
                                                        const val = Number(rawVal);
                                                        if (!Number.isNaN(val)) {
                                                             
                                                            console.debug('[Notifications] click load targetUserId:', val);
                                                            // allow form onSubmit to handle; no duplicate call needed
                                                        }
                                                    }}
                                                >
                                                    Load
                                                </Button>
                                                {viewingUserId && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="btn btn-outline-primary btn-xs h-7 px-3"
                                                        onClick={()=>{ loadNotifications(); if (targetUserInputRef.current) targetUserInputRef.current.value=''; }}
                                                    >
                                                        Mine
                                                    </Button>
                                                )}
                                            </form>
                                            {viewingUserId && (
                                                <div className="text-[10px] italic text-amber-600 flex items-center justify-between">
                                                    Viewing user ID {viewingUserId}{metaTargetUserId && metaTargetUserId !== viewingUserId ? ` (meta: ${metaTargetUserId})` : ''}
                                                    <Button
                                                        type="button"
                                                        variant="link"
                                                        className="underline"
                                                        onClick={()=>{ loadNotifications(); if (targetUserInputRef.current) targetUserInputRef.current.value=''; }}
                                                    >
                                                        return
                                                    </Button>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 text-[10px]">
                                                <Label className="flex items-center gap-1 cursor-pointer select-none">
                                                    <Checkbox
                                                        checked={realtimeEnabled}
                                                        onCheckedChange={(checked)=> setRealtimeEnabled(Boolean(checked))}
                                                        className="form-checkbox h-3 w-3"
                                                    />
                                                    <span>Live feed</span>
                                                </Label>
                                                <span className="text-gray-400">({notifications.length}/{MAX_NOTIFICATIONS})</span>
                                            </div>
                                        </li>
                                    )}
                                    {loadingNotifications && (
                                        <li className="py-4 text-center text-xs text-gray-500">Loading...</li>
                                    )}
                                    {notifError && !loadingNotifications && (
                                        <li className="py-2 px-4 text-xs text-red-600">{notifError}</li>
                                    )}
                                    {!loadingNotifications && notifications.length > 0 ? (
                                        <>
                                            {notifications.map((notification: Notification) => (
                                                <li
                                                    key={notification.id}
                                                    className={`dark:text-white-light/90 cursor-pointer ${!notification.read ? 'bg-orange-50 dark:bg-slate-800/40' : ''}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!notification.read) markNotificationRead(notification.id);
                                                    }}
                                                >
                                                    <div className="group flex items-center px-4 py-2">
                                                        <div className="grid place-content-center rounded-sm">
                                                            <div className="relative h-12 w-12">
                                                                <img className="h-12 w-12 rounded-full object-cover" alt="profile" src={notification.profile} />
                                                                {!notification.read && <span className="absolute bottom-0 right-1.5 block h-2 w-2 rounded-full bg-success"></span>}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-auto ltr:pl-3 rtl:pr-3">
                                                            <div className="ltr:pr-3 rtl:pl-3">
                                                                <h6 className={`font-${notification.read ? 'normal' : 'semibold'}`}>{notification.message}</h6>
                                                                <span className={`block ${textSizeClasses.small} font-normal dark:text-gray-500`}>{notification.time === 'Just now' ? 'Just now' : new Date(notification.time).toLocaleString()}</span>
                                                            </div>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-neutral-300 opacity-0 hover:text-danger group-hover:opacity-100 ltr:ml-auto rtl:mr-auto"
                                                                onClick={() => removeNotification(notification.id)}
                                                            >
                                                                <IconXCircle />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                            <li>
                                                <div className="p-4 flex gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="default"
                                                        size="sm"
                                                        className="btn btn-primary btn-small flex-1"
                                                        onClick={(e) => { e.stopPropagation(); markAllRead(); }}
                                                        disabled={unreadCount === 0 || (viewingUserId !== null && viewingUserId !== selfUserId)}
                                                    >
                                                        {(viewingUserId !== null && viewingUserId !== selfUserId) ? 'Mark All (Disabled)' : 'Mark All Read'}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        size="sm"
                                                        className="btn btn-secondary btn-small flex-1"
                                                        onClick={(e) => { e.stopPropagation(); loadNotifications(viewingUserId || undefined); if (!viewingUserId) loadUnreadCount(); }}
                                                    >
                                                        Refresh
                                                    </Button>
                                                </div>
                                            </li>
                                            {notifications.length >= MAX_NOTIFICATIONS && (
                                                <li className="px-4 pb-2 text-[10px] text-gray-500">Showing latest {MAX_NOTIFICATIONS} notifications (older trimmed).</li>
                                            )}
                                        </>
                                    ) : (
                                        !loadingNotifications && (
                                            <li onClick={(e) => e.stopPropagation()}>
                                                <Button type="button" variant="ghost" className="grid! min-h-40 place-content-center text-sm hover:bg-transparent! w-full">
                                                    <div className="mx-auto mb-3 rounded-full ring-4 ring-primary/20 p-2 w-fit">
                                                        <IconInfoCircle fill={true} className="h-8 w-8 text-primary" />
                                                    </div>
                                                    {notifError ? 'Failed to load notifications' : 'No notifications'}
                                                </Button>
                                            </li>
                                        )
                                    )}
                                    </ul>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div className="dropdown flex shrink-0">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button type="button" variant="ghost" size="icon" className="relative group block">
                                        <img className="h-9 w-9 rounded-full object-cover saturate-50 group-hover:saturate-100" src={userAvatar} alt={userDisplayName} />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align={isRtl ? 'start' : 'end'}
                                    side="bottom"
                                    sideOffset={8}
                                    className="p-0"
                                >
                                    <ul className="w-57.5 py-0! font-semibold text-dark dark:text-white-light/90 bg-white dark:bg-black rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
                                    <li>
                                        <div className="flex items-center px-4 py-4 border-b border-gray-200 dark:border-white-light/10">
                                            <img className="h-10 w-10 rounded-md object-cover" src={userAvatar} alt={userDisplayName} />
                                            <div className="truncate ltr:pl-4 rtl:pr-4">
                                                <h4 className={`${textSizeClasses.base} font-semibold`}>
                                                    {userDisplayName}
                                                </h4>
                                                {userEmail && (
                                                    <p className="text-xs text-black/60 dark:text-dark-light/60 truncate">
                                                        {userEmail}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                    <li>
                                        <Link href="/users/profile" className="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-white-light/5 dark:hover:text-white transition-colors text-xs gap-2">
                                            <IconUser className="h-4.5 w-4.5" />
                                            Profile
                                        </Link>
                                    </li>
                                    <li>
                                        <Button
                                            onClick={() => setCustomSidebarOpen(true)}
                                            variant="ghost"
                                            className="dark:hover:text-white w-full justify-start px-2 py-2 hover:bg-gray-50 dark:hover:bg-white-light/5 text-xs rounded-none h-auto font-semibold gap-2"
                                        >
                                            <IconSettings className="w-4.5 h-4.5" />
                                            Settings
                                        </Button>
                                    </li>
                                    <li className="border-t border-gray-200 dark:border-white-light/10">
                                        <Button
                                            onClick={handleLogout}
                                            variant="ghost"
                                            className="text-danger hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center w-full justify-start px-4 py-3 rounded-none h-auto font-semibold"
                                        >
                                            <IconLogout className="h-4.5 w-4.5 shrink-0 rotate-90 ltr:mr-2 rtl:ml-2" />
                                            Sign Out
                                        </Button>
                                    </li>
                                </ul>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>

                {/* horizontal menu */}
                <ul className="horizontal-menu hidden border-t border-[#ebedf2] bg-white px-6 py-1.5 font-semibold text-black rtl:space-x-reverse dark:border-[#191e3a] dark:bg-black dark:text-white-dark lg:space-x-1.5 xl:space-x-8">
                    {navTree
                        ?.sort((a: any, b: any) => a.position - b.position)
                        .map((section: any) => (
                            <li key={section.navId} className="menu nav-item relative">
                                <Button type="button" variant="ghost" className="nav-link uppercase font-semibold">
                                    <div className="flex items-center">
                                        <span className="px-1">{section.title}</span>
                                    </div>
                                    {section.children && section.children.length > 0 && (
                                        <div className="right_arrow">
                                            <IconCaretDown />
                                        </div>
                                    )}
                                </Button>
                                {section.children && section.children.length > 0 && (
                                    <ul className="sub-menu">
                                        {section.children
                                            ?.sort((a: any, b: any) => a.position - b.position)
                                            .map((item: any) => (
                                                <li key={item.navId} className="relative group">
                                                    {item.children && item.children.length > 0 ? (
                                                        <div className="w-full">
                                                            <div className="flex items-center justify-between px-4 py-1.5 hover:bg-orange-300 dark:hover:bg-dark/60">
                                                                <span>{item.title}</span>
                                                                <div className="ltr:ml-auto rtl:mr-auto rtl:rotate-90 -rotate-90">
                                                                    <IconCaretDown />
                                                                </div>
                                                            </div>
                                                            <ul className="absolute top-0 ltr:left-[95%] rtl:right-[95%] min-w-45 bg-stone-100 z-10 text-dark dark:text-white-dark dark:bg-[#1b2e4b] shadow-2xl hidden group-hover:block">
                                                                {item.children
                                                                    ?.sort((a: any, b: any) => a.position - b.position)
                                                                    .map((child: any) => (
                                                                        <li key={child.navId}>
                                                                            {child.children && child.children.length > 0 ? (
                                                                                <div className="w-full">
                                                                                    <div className="flex items-center justify-between py-2 hover:text-primary hover:bg-orange-300 dark:hover:bg-dark/60">
                                                                                        <span>{child.title}</span>
                                                                                        <div className="ltr:ml-auto rtl:mr-auto rtl:rotate-90 -rotate-90">
                                                                                            <IconCaretDown />
                                                                                        </div>
                                                                                    </div>
                                                                                    <ul className="absolute top-0 ltr:left-[95%] rtl:right-[95%] min-w-45 bg-white-light z-10 text-dark dark:text-white-dark dark:bg-[#1b2e4b] shadow-2xl py-2 hidden group-hover:block">
                                                                                        {child.children
                                                                                            ?.sort((a: any, b: any) => a.position - b.position)
                                                                                            .map((subChild: any) => (
                                                                                                <li key={subChild.navId}>
                                                                                                    <Link href={subChild.path || '#'}>{subChild.title}</Link>
                                                                                                </li>
                                                                                            ))}
                                                                                    </ul>
                                                                                </div>
                                                                            ) : (
                                                                                <Link href={child.path || '#'}>{child.title}</Link>
                                                                            )}
                                                                        </li>
                                                                    ))}
                                                            </ul>
                                                        </div>
                                                    ) : (
                                                        <Link href={item.path || '#'}>{item.title}</Link>
                                                    )}
                                                </li>
                                            ))}
                                    </ul>
                                )}
                            </li>
                        ))}
                </ul>
            </div>
            <CustomSidebar isOpen={isCustomSidebarOpen} onClose={() => setCustomSidebarOpen(false)}>
                <Setting />
            </CustomSidebar>
        </header>
    );
};

export default Header;
