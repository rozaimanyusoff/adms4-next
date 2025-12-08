'use client';
import PerfectScrollbar from 'react-perfect-scrollbar';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import { toggleSidebar } from '@/store/themeConfigSlice';
import AnimateHeight from 'react-animate-height';
import { IRootState } from '@/store';
import React, { useState, useEffect, useContext } from 'react';
import IconCaretsDown from '@/components/icon/icon-carets-down';
import IconCaretDown from '@/components/icon/icon-caret-down';
import { usePathname } from 'next/navigation';
import { AuthContext } from '@store/AuthContext'; // Ensure correct typing for AuthContext
import { useModuleBadges } from '@/hooks/use-module-badges';

const Sidebar = () => {
    const dispatch = useDispatch();
    const pathname = usePathname();
    const authContext = useContext(AuthContext);
    if (!authContext) {
        throw new Error('AuthContext is not provided. Ensure the component is wrapped in an AuthProvider.');
    }
    const { authData } = authContext; // Safely access authData
    const [currentMenu, setCurrentMenu] = useState<string>('');
    const [errorSubMenu, setErrorSubMenu] = useState(false);
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const semidark = useSelector((state: IRootState) => state.themeConfig.semidark);
    const [navTree, setNavTree] = useState<any[]>([]);
    const { counts } = useModuleBadges({ enabled: true, pollIntervalMs: 60000 });

    const setActiveRoute = React.useCallback(() => {
        // Use setTimeout to ensure DOM is fully rendered
        setTimeout(() => {
            // Remove all existing active classes
            let allLinks = document.querySelectorAll('.sidebar ul a.active');
            console.log('Removing active from links:', allLinks);
            for (let i = 0; i < allLinks.length; i++) {
                const element = allLinks[i];
                element?.classList.remove('active');
            }
            
            // Remove active class from buttons too
            let allButtons = document.querySelectorAll('.sidebar ul button.active');
            console.log('Removing active from buttons:', allButtons);
            for (let i = 0; i < allButtons.length; i++) {
                const element = allButtons[i];
                element?.classList.remove('active');
            }
            
            // Find and activate the current route
            const currentPath = window.location.pathname;
            console.log('Looking for path:', currentPath);
            
            let selector = document.querySelector('.sidebar ul a[href="' + currentPath + '"]');
            console.log('Exact match selector:', selector);
            
            // If exact match not found, try to find a partial match
            if (!selector) {
                const allLinks = document.querySelectorAll('.sidebar ul a[href]');
                console.log('All sidebar links:', allLinks);
                for (let i = 0; i < allLinks.length; i++) {
                    const link = allLinks[i] as HTMLAnchorElement;
                    const href = link.getAttribute('href');
                    console.log('Checking link:', href, 'against:', currentPath);
                    if (href && currentPath.startsWith(href) && href !== '/') {
                        selector = link;
                        console.log('Partial match found:', href);
                        break;
                    }
                }
            }
            
            if (selector) {
                console.log('Activating selector:', selector);
                selector.classList.add('active');
                
                // Check if this is in a submenu and expand parent menu
                const ul = selector.closest('ul.sub-menu');
                if (ul) {
                    console.log('Found submenu:', ul);
                    const parentLi = ul.closest('li.menu');
                    if (parentLi) {
                        const parentButton = parentLi.querySelector('button.nav-link');
                        if (parentButton) {
                            console.log('Activating parent button:', parentButton);
                            parentButton.classList.add('active');
                            const navId = parentButton.getAttribute('data-nav-id') || parentLi.getAttribute('data-nav-id');
                            if (navId) {
                                console.log('Setting current menu:', navId);
                                setCurrentMenu(navId);
                            }
                        }
                    }
                }
            } else {
                console.log('No matching selector found for path:', currentPath);
            }
        }, 200); // Increased delay to ensure Perfect Scrollbar is ready
    }, []);

    useEffect(() => {
        if (authData?.navTree) {
            const filteredNavTree = authData.navTree.filter(item => item.status !== 0);
            setNavTree(filteredNavTree); // Set navTree excluding items with status = 0
            
            // Re-run active route detection after nav tree is loaded
            setTimeout(() => {
                setActiveRoute();
            }, 100);
        }
    }, [authData, pathname, setActiveRoute]); // Added pathname dependency

    const toggleMenu = (value: string) => {
        setCurrentMenu((oldValue) => {
            return oldValue === value ? '' : value;
        });
    };

    useEffect(() => {
        const selector = document.querySelector('.sidebar ul a[href="' + window.location.pathname + '"]');
        if (selector) {
            selector.classList.add('active');
            const ul: any = selector.closest('ul.sub-menu');
            if (ul) {
                let ele: any = ul.closest('li.menu').querySelectorAll('.nav-link') || [];
                if (ele.length) {
                    ele = ele[0];
                    setTimeout(() => {
                        ele.click();
                    });
                }
            }
        }
    }, [pathname]); // Added pathname dependency

    useEffect(() => {
        setActiveRoute();
        if (window.innerWidth < 768 && themeConfig.sidebar) {
            dispatch(toggleSidebar());
        }
        // Debug: Log current path and active elements
        console.log('Current pathname:', pathname);
        console.log('Active links:', document.querySelectorAll('.sidebar ul a.active'));
    }, [pathname, setActiveRoute]);

    const renderMenuItems = (items: any) => {
        if (!Array.isArray(items)) {
            console.error('Invalid items format:', items);
            return null;
        }

        return items.map((item: any) => {
            if (item.type === 'section') {
                return (
                    <React.Fragment key={item.navId || `section-${item.title}`}>
                        <h2 className="py-2 px-9 flex items-center uppercase font-extrabold bg-slate-800/50 text-dark-light dark:bg-dark dark:bg-opacity-[0.08] -mx-4">
                            <span>{item.title}</span>
                        </h2>
                        {item.children && renderMenuItems(item.children)}
                    </React.Fragment>
                );
            }

            return (
                <li key={item.navId} className="menu nav-item" data-nav-id={item.navId}>
                    {item.children && item.children.length > 0 ? (
                        <>
                            <button
                                type="button"
                                className={`${currentMenu === item.navId ? 'active' : ''} nav-link group w-full`}
                                onClick={() => toggleMenu(item.navId)}
                                data-nav-id={item.navId}
                            >
                                <div className="flex items-center">
                                    <span className="ltr:pl-5 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">
                                        {item.title}
                                    </span>
                                </div>
                                <div className={currentMenu !== item.navId ? 'rtl:rotate-90 -rotate-90' : ''}>
                                    <IconCaretDown />
                                </div>
                            </button>
                            <AnimateHeight duration={300} height={currentMenu === item.navId ? 'auto' : 0}>
                                <ul className="sub-menu text-gray-500">
                                    {item.children.map((subItem: any) => (
                                        <li key={subItem.navId} className='pl-4'>
                                            {subItem.children && subItem.children.length > 0 ? (
                                                <React.Fragment key={subItem.navId}>
                                                    <button
                                                        type="button"
                                                        className={`${currentMenu === subItem.navId ? 'active' : ''} nav-link group w-full`}
                                                        onClick={() => toggleMenu(subItem.navId)}
                                                    >
                                                        <div className="flex items-center">
                                                            <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">
                                                                {subItem.title}
                                                            </span>
                                                        </div>
                                                        <div className={currentMenu !== subItem.navId ? 'rtl:rotate-90 -rotate-90' : ''}>
                                                            <IconCaretDown />
                                                        </div>
                                                    </button>
                                                    <AnimateHeight duration={300} height={currentMenu === subItem.navId ? 'auto' : 0}>
                                                        <ul className="sub-menu text-gray-500">
                                                            {renderMenuItems(subItem.children)}
                                                        </ul>
                                                    </AnimateHeight>
                                                </React.Fragment>
                                            ) : (
                                                <Link
                                                    href={subItem.path || '#'}
                                                    className="group relative flex items-center justify-between"
                                                >
                                                    <div className="flex items-center">
                                                        <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">
                                                            {subItem.title}
                                                        </span>
                                                    </div>
                                                    {counts[subItem.path || ''] > 0 && (
                                                        <span className="mr-3 inline-flex h-5 min-w-[18px] items-center justify-center rounded-full bg-orange-500 px-1 text-[11px] font-semibold text-white">
                                                            {counts[subItem.path || '']}
                                                        </span>
                                                    )}
                                                </Link>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </AnimateHeight>
                        </>
                    ) : (
                        <Link href={item.path || '#'} className="group relative flex items-center justify-between">
                            <div className="flex items-center">
                                <span className="ltr:pl-5 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">
                                    {item.title}
                                </span>
                            </div>
                            {counts[item.path || ''] > 0 && (
                                <span className="mr-3 inline-flex h-5 min-w-[18px] items-center justify-center rounded-full bg-orange-500 px-1 text-[11px] font-semibold text-white">
                                    {counts[item.path || '']}
                                </span>
                            )}
                        </Link>
                    )}
                </li>
            );
        });
    };

    return (
        <div className={semidark ? 'dark' : ''}>
            <nav
                className={`sidebar fixed bottom-0 top-0 z-50 h-full min-h-screen max-w-lg md:min-w-[260px] transition-all duration-300 ${semidark ? 'text-white-dark' : ''}`}
            >
                <div className="h-full bg-slate-200 dark:bg-black">
                    <div className="flex items-center justify-between px-4 py-1.5">
                        <Link href="/" className="main-logo flex shrink-0 gap-4 items-center">
                            <img className="ml-[5px] w-8 flex-none" src={`${themeConfig.isDarkMode ? process.env.NEXT_PUBLIC_BRAND_LOGO_DARK : process.env.NEXT_PUBLIC_BRAND_LOGO_LIGHT}`} alt="logo" />
                            <h1 className="align-middle font-extrabold text-3xl text-shadow-xs ltr:ml-5 rtl:mr-5 dark:text-white-light lg:inline">{process.env.NEXT_PUBLIC_APP_NAME}</h1>
                        </Link>

                        <button
                            type="button"
                            className="collapse-icon flex h-8 w-8 items-center transition duration-300 hover:bg-gray-500/10 rtl:rotate-180 dark:text-white-light dark:hover:bg-dark-light/10"
                            onClick={() => dispatch(toggleSidebar())}
                        >
                            <IconCaretsDown className="m-auto rotate-90 text-orange-500" />
                        </button>
                    </div>
                    {/* Scroll container with auto-hide scrollbar */}
                    <div className="relative h-[calc(100vh-80px)] overflow-y-auto auto-hide-scroll">
                        <ul className="relative font-semibold space-y-0.5">
                            {renderMenuItems(navTree)}
                        </ul>
                    </div>
                </div>
            </nav>
        </div>
    );
};

export default Sidebar;
