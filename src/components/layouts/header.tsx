'use client';
import { useEffect, useState, useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import { IRootState } from '@/store';
import { toggleTheme, toggleSidebar, toggleRTL } from '@/store/themeConfigSlice';
import Dropdown from '@/components/dropdown';
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
interface Notification {
    id: number;
    profile: string;
    message: string;
    time: string;
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

    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
        const socket = io(socketUrl, { transports: ['websocket'] });
        socket.on('notification', (data) => {
            // Only show notification if user is admin (role id = 1)
            if (authData?.user?.role?.id === 1) {
                setNotifications((prev) => [
                    {
                        id: Date.now(),
                        profile: 'user-profile.jpeg',
                        message: data.message || '<strong>New Notification</strong>',
                        time: 'Just now',
                    },
                    ...prev,
                ]);
            }
        });
        return () => {
            socket.disconnect();
        };
    }, [authData?.user?.role?.id]);

    const removeNotification = (value: number) => {
        setNotifications(notifications.filter((user) => user.id !== value));
    };

    const [search, setSearch] = useState(false);

    const renderMenuItems = (items: any[]) => {
        return items.map((item) => {
            if (item.type === 'section') {
                return (
                    <li key={item.navId} className="menu nav-item relative">
                        <button type="button" className="nav-link">
                            <div className="flex items-center">
                                <span className="px-1">{item.title}</span>
                            </div>
                            <div className="right_arrow">
                                <IconCaretDown />
                            </div>
                        </button>
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
        try {
            await authenticatedApi.post('/api/auth/logout');
        } catch (e) {
            // Optionally handle error
        }
        localStorage.clear();
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
                        <button
                            type="button"
                            className="collapse-icon flex flex-none hover:bg-white-light/90 hover:text-primary ltr:ml-2 rtl:mr-2 dark:bg-dark/40 dark:text-[#d0d2d6] dark:hover:bg-dark/60 dark:hover:text-primary lg:hidden"
                            onClick={() => dispatch(toggleSidebar())}
                        >
                            <IconMenu className="h-7 w-7 text-orange-600" />
                        </button>
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
                                <button
                                    type="button"
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
                                </button>
                                <div className="flex items-center px-2 min-w-[40px] justify-center">
                                    <span className="text-sm font-semibold">T</span>
                                </div>
                                <button
                                    type="button"
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
                                </button>
                            </div>
                        </div>
                        <div>
                            {themeConfig.theme === 'light' ? (
                                <button
                                    className={`${themeConfig.theme === 'light' &&
                                        'flex items-center rounded-full bg-white-light/40 p-2 hover:bg-white-light/90 hover:text-primary dark:bg-dark/40 dark:hover:bg-dark/60'
                                        }`}
                                    onClick={() => dispatch(toggleTheme('dark'))}
                                >
                                    <IconSun />
                                </button>
                            ) : (
                                ''
                            )}
                            {themeConfig.theme === 'dark' && (
                                <button
                                    className={`${themeConfig.theme === 'dark' &&
                                        'flex items-center rounded-full bg-white-light/40 p-2 hover:bg-white-light/90 hover:text-primary dark:bg-dark/40 dark:hover:bg-dark/60'
                                        }`}
                                    onClick={() => dispatch(toggleTheme('system'))}
                                >
                                    <IconMoon />
                                </button>
                            )}
                            {themeConfig.theme === 'system' && (
                                <button
                                    className={`${themeConfig.theme === 'system' &&
                                        'flex items-center rounded-full bg-white-light/40 p-2 hover:bg-white-light/90 hover:text-primary dark:bg-dark/40 dark:hover:bg-dark/60'
                                        }`}
                                    onClick={() => dispatch(toggleTheme('light'))}
                                >
                                    <IconLaptop />
                                </button>
                            )}
                        </div>
                        <div className="dropdown shrink-0">
                            <Dropdown
                                offset={[0, 8]}
                                placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`}
                                btnClassName="relative block p-2 rounded-full bg-white-light/40 dark:bg-dark/40 hover:text-primary hover:bg-white-light/90 dark:hover:bg-dark/60"
                                button={
                                    <span>
                                        <IconBellBing />
                                        <span className="absolute top-0 flex h-3 w-3 ltr:right-0 rtl:left-0">
                                            <span className="absolute -top-[3px] inline-flex h-full w-full animate-ping rounded-full bg-success/50 opacity-75 ltr:-left-[3px] rtl:-right-[3px]"></span>
                                            <span className="relative inline-flex h-[6px] w-[6px] rounded-full bg-success"></span>
                                        </span>
                                    </span>
                                }
                            >
                                <ul className="w-[300px] divide-y py-0! text-dark dark:divide-white/10 dark:text-white-dark sm:w-[350px]">
                                    <li onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-between px-4 py-2 font-semibold">
                                            <h4 className={textSizeClasses.heading}>Notification</h4>
                                            {notifications.length ? <span className="badge bg-primary/80">{notifications.length} New</span> : ''}
                                        </div>
                                    </li>
                                    {notifications.length > 0 ? (
                                        <>
                                            {notifications.map((notification: Notification) => (
                                                <li key={notification.id} className="dark:text-white-light/90" onClick={(e) => e.stopPropagation()}>
                                                    <div className="group flex items-center px-4 py-2">
                                                        <div className="grid place-content-center rounded-sm">
                                                            <div className="relative h-12 w-12">
                                                                <img className="h-12 w-12 rounded-full object-cover" alt="profile" src={`/assets/images/${notification.profile}`} />
                                                                <span className="absolute bottom-0 right-[6px] block h-2 w-2 rounded-full bg-success"></span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-auto ltr:pl-3 rtl:pr-3">
                                                            <div className="ltr:pr-3 rtl:pl-3">
                                                                <h6
                                                                    dangerouslySetInnerHTML={{
                                                                        __html: notification.message,
                                                                    }}
                                                                ></h6>
                                                                <span className={`block ${textSizeClasses.small} font-normal dark:text-gray-500`}>{notification.time}</span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="text-neutral-300 opacity-0 hover:text-danger group-hover:opacity-100 ltr:ml-auto rtl:mr-auto"
                                                                onClick={() => removeNotification(notification.id)}
                                                            >
                                                                <IconXCircle />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                            <li>
                                                <div className="p-4">
                                                    <button className="btn btn-primary btn-small block w-full">Read All Notifications</button>
                                                </div>
                                            </li>
                                        </>
                                    ) : (
                                        <li onClick={(e) => e.stopPropagation()}>
                                            <button type="button" className="!grid min-h-[200px] place-content-center text-lg hover:bg-transparent!">
                                                <div className="mx-auto mb-4 rounded-full ring-4 ring-primary/30">
                                                    <IconInfoCircle fill={true} className="h-10 w-10 text-primary" />
                                                </div>
                                                No data available.
                                            </button>
                                        </li>
                                    )}
                                </ul>
                            </Dropdown>
                        </div>
                        <div className="dropdown flex shrink-0">
                            <Dropdown
                                offset={[0, 8]}
                                placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`}
                                btnClassName="relative group block"
                                button={<img className="h-9 w-9 rounded-full object-cover saturate-50 group-hover:saturate-100" src="/assets/images/user-profile.jpeg" alt="userProfile" />}
                            >
                                <ul className="w-[230px] py-0! font-semibold text-dark dark:text-white-light/90">
                                    <li>
                                        <div className="flex items-center px-4 py-4">
                                            <img className="h-10 w-10 rounded-md object-cover" src="/assets/images/user-profile.jpeg" alt="userProfile" />
                                            <div className="truncate ltr:pl-4 rtl:pr-4">
                                                <h4 className={textSizeClasses.base}>
                                                    John Doe
                                                    <span className={`rounded bg-success-light px-1 ${textSizeClasses.small} text-success ltr:ml-2 rtl:ml-2`}>Pro</span>
                                                </h4>
                                                <button type="button" className="text-black/60 hover:text-primary dark:text-dark-light/60 dark:hover:text-white">
                                                    johndoe@gmail.com
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                    <li>
                                        <Link href="/users/profile" className="dark:hover:text-white">
                                            <IconUser className="h-4.5 w-4.5 shrink-0 ltr:mr-2 rtl:ml-2" />
                                            Profile
                                        </Link>
                                    </li>
                                    <li>
                                        <button
                                            onClick={() => setCustomSidebarOpen(true)}
                                            className="dark:hover:text-white w-full text-left"
                                        >
                                            <IconSettings className="w-4.5 h-4.5 ltr:mr-2 rtl:ml-2 shrink-0" />
                                            Settings
                                        </button>
                                    </li>
                                    <li className="border-t border-white-light dark:border-white-light/10">
                                        <button
                                            onClick={handleLogout}
                                            className="py-3! text-danger flex items-center"
                                        >
                                            <IconLogout className="h-4.5 w-4.5 shrink-0 rotate-90 ltr:mr-2 rtl:ml-2" />
                                            Sign Out
                                        </button>
                                    </li>
                                </ul>
                            </Dropdown>
                        </div>
                    </div>
                </div>

                {/* horizontal menu */}
                <ul className="horizontal-menu hidden border-t border-[#ebedf2] bg-white px-6 py-1.5 font-semibold text-black rtl:space-x-reverse dark:border-[#191e3a] dark:bg-black dark:text-white-dark lg:space-x-1.5 xl:space-x-8">
                    {navTree
                        ?.sort((a: any, b: any) => a.position - b.position)
                        .map((section: any) => (
                            <li key={section.navId} className="menu nav-item relative">
                                <button type="button" className="nav-link uppercase font-semibold">
                                    <div className="flex items-center">
                                        <span className="px-1">{section.title}</span>
                                    </div>
                                    {section.children && section.children.length > 0 && (
                                        <div className="right_arrow">
                                            <IconCaretDown />
                                        </div>
                                    )}
                                </button>
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
                                                            <ul className="absolute top-0 ltr:left-[95%] rtl:right-[95%] min-w-[180px] bg-stone-100 z-10 text-dark dark:text-white-dark dark:bg-[#1b2e4b] shadow-2xl hidden group-hover:block">
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
                                                                                    <ul className="absolute top-0 ltr:left-[95%] rtl:right-[95%] min-w-[180px] bg-white-light z-10 text-dark dark:text-white-dark dark:bg-[#1b2e4b] shadow-2xl py-2 hidden group-hover:block">
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
