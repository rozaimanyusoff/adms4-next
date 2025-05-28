'use client';
import PerfectScrollbar from 'react-perfect-scrollbar';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import { toggleSidebar } from '@/store/themeConfigSlice';
import AnimateHeight from 'react-animate-height';
import { IRootState } from '@/store';
import React, { useState, useEffect, useContext } from 'react';
import IconCaretsDown from '@/components/icon/icon-carets-down';
import IconMenuDashboard from '@/components/icon/menu/icon-menu-dashboard';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconMinus from '@/components/icon/icon-minus';
import IconMenuChat from '@/components/icon/menu/icon-menu-chat';
import IconMenuMailbox from '@/components/icon/menu/icon-menu-mailbox';
import IconMenuTodo from '@/components/icon/menu/icon-menu-todo';
import IconMenuNotes from '@/components/icon/menu/icon-menu-notes';
import IconMenuScrumboard from '@/components/icon/menu/icon-menu-scrumboard';
import IconMenuContacts from '@/components/icon/menu/icon-menu-contacts';
import IconMenuInvoice from '@/components/icon/menu/icon-menu-invoice';
import IconMenuCalendar from '@/components/icon/menu/icon-menu-calendar';
import IconMenuComponents from '@/components/icon/menu/icon-menu-components';
import IconMenuElements from '@/components/icon/menu/icon-menu-elements';
import IconMenuCharts from '@/components/icon/menu/icon-menu-charts';
import IconMenuWidgets from '@/components/icon/menu/icon-menu-widgets';
import IconMenuFontIcons from '@/components/icon/menu/icon-menu-font-icons';
import IconMenuDragAndDrop from '@/components/icon/menu/icon-menu-drag-and-drop';
import IconMenuTables from '@/components/icon/menu/icon-menu-tables';
import IconMenuDatatables from '@/components/icon/menu/icon-menu-datatables';
import IconMenuForms from '@/components/icon/menu/icon-menu-forms';
import IconMenuUsers from '@/components/icon/menu/icon-menu-users';
import IconMenuPages from '@/components/icon/menu/icon-menu-pages';
import IconMenuAuthentication from '@/components/icon/menu/icon-menu-authentication';
import IconMenuDocumentation from '@/components/icon/menu/icon-menu-documentation';
import { usePathname } from 'next/navigation';
import { AuthContext } from '@store/AuthContext'; // Ensure correct typing for AuthContext

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

    useEffect(() => {
        if (authData?.navTree) {
            const filteredNavTree = authData.navTree.filter(item => item.status !== 0);
            setNavTree(filteredNavTree); // Set navTree excluding items with status = 0
        }
    }, [authData]);

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
    }, []);

    useEffect(() => {
        setActiveRoute();
        if (window.innerWidth < 1024 && themeConfig.sidebar) {
            dispatch(toggleSidebar());
        }
    }, [pathname]);

    const setActiveRoute = () => {
        let allLinks = document.querySelectorAll('.sidebar ul a.active');
        for (let i = 0; i < allLinks.length; i++) {
            const element = allLinks[i];
            element?.classList.remove('active');
        }
        const selector = document.querySelector('.sidebar ul a[href="' + window.location.pathname + '"]');
        selector?.classList.add('active');
    };

    const renderMenuItems = (items: any) => {
        if (!Array.isArray(items)) {
            console.error('Invalid items format:', items);
            return null;
        }

        return items.map((item: any) => {
            if (item.type === 'section') {
                return (
                    <React.Fragment key={item.navId || `section-${item.title}`}>
                        <h2 className="py-2.5 px-7 flex items-center uppercase font-extrabold bg-sky-50 dark:bg-dark dark:bg-opacity-[0.08] -mx-4">
                            <span>{item.title}</span>
                        </h2>
                        {item.children && renderMenuItems(item.children)}
                    </React.Fragment>
                );
            }

            return (
                <li key={item.navId} className="menu nav-item">
                    {item.children && item.children.length > 0 ? (
                        <>
                            <button
                                type="button"
                                className={`${currentMenu === item.navId ? 'active' : ''} nav-link group w-full`}
                                onClick={() => toggleMenu(item.navId)}
                            >
                                <div className="flex items-center">
                                    <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">
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
                                        <li key={subItem.navId}>
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
                                                    className="group"
                                                >
                                                    <div className="flex items-center">
                                                        <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">
                                                            {subItem.title}
                                                        </span>
                                                    </div>
                                                </Link>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </AnimateHeight>
                        </>
                    ) : (
                        <Link href={item.path || '#'} className="group">
                            <div className="flex items-center">
                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">
                                    {item.title}
                                </span>
                            </div>
                        </Link>
                    )}
                </li>
            );
        });
    };

    return (
        <div className={semidark ? 'dark' : ''}>
            <nav
                className={`sidebar fixed bottom-0 top-0 z-50 h-full min-h-screen w-[260px] transition-all duration-300 ${semidark ? 'text-white-dark' : ''}`}
            >
                <div className="h-full bg-white dark:bg-black">
                    <div className="flex items-center justify-between px-4 py-3">
                        <Link href="/" className="main-logo flex shrink-0 items-center">
                            <img className="ml-[5px] w-8 flex-none" src={`${themeConfig.isDarkMode ? process.env.NEXT_PUBLIC_BRAND_LOGO_DARK : process.env.NEXT_PUBLIC_BRAND_LOGO_LIGHT}`} alt="logo" />
                            <span className="align-middle text-2xl font-semibold ltr:ml-1.5 rtl:mr-1.5 dark:text-white-light lg:inline">{process.env.NEXT_PUBLIC_APP_NAME}</span>
                        </Link>

                        <button
                            type="button"
                            className="collapse-icon flex h-8 w-8 items-center rounded-full transition duration-300 hover:bg-gray-500/10 rtl:rotate-180 dark:text-white-light dark:hover:bg-dark-light/10"
                            onClick={() => dispatch(toggleSidebar())}
                        >
                            <IconCaretsDown className="m-auto rotate-90" />
                        </button>
                    </div>
                    <PerfectScrollbar className="relative h-[calc(100vh-80px)]">
                        <ul className="relative font-semibold space-y-0.5 p-4 py-0">
                            {renderMenuItems(navTree)}
                        </ul>
                    </PerfectScrollbar>
                </div>
            </nav>
        </div>
    );
};

export default Sidebar;
