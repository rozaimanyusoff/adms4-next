'use client';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '@/store';
import { toggleAnimation, toggleLayout, toggleMenu, toggleNavbar, toggleRTL, toggleTheme, toggleSemidark, resetToggleSidebar } from '@/store/themeConfigSlice';
import IconSettings from '@/components/icon/icon-settings';
import IconX from '@/components/icon/icon-x';
import IconSun from '@/components/icon/icon-sun';
import IconMoon from '@/components/icon/icon-moon';
import IconLaptop from '@/components/icon/icon-laptop';

const Setting = () => {
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const dispatch = useDispatch();

    const [showCustomizer, setShowCustomizer] = useState(false);

    return (
        <div className={`overflow-y-auto overflow-x-hidden perfect-scrollbar h-full ${themeConfig.isDarkMode ? 'bg-gray-700' : ''}`}>
            <div className="text-center relative pb-5">
                <h4 className="mb-1 dark:text-white font-extrabold">TEMPLATE CUSTOMIZER</h4>
                <p className="text-dark dark:text-white-light mt-4 font-semibold">Set preferences that will be cookied for your live preview demonstration.</p>
            </div>

            <div className="border border-dotted border-stone-400 dark:border-gray-400 rounded-2xl mb-3 p-2">
                <h5 className="mb-1 text-base dark:text-white leading-none">Color Scheme</h5>
                <p className="text-dark text-xs font-semibold dark:text-white-light">Overall light or dark presentation.</p>
                <div className="grid grid-cols-3 gap-2 mt-3">
                    <button type="button" className={`${themeConfig.theme === 'light' ? 'bg-blue-600 border-0 text-white dark:text-gray-300' : 'border border-blue-600 dark:border-blue-500 dark:text-gray-300 hover:bg-blue-600'} text-xs btn shadow-none rounded-full`} onClick={() => dispatch(toggleTheme('light'))}>
                        <IconSun className="w-5 h-5 shrink-0 ltr:mr-1 rtl:ml-1" />
                        Light
                    </button>

                    <button type="button" className={`${themeConfig.theme === 'dark' ? 'bg-blue-600 border-0 text-white dark:text-gray-300' : 'border border-blue-600 dark:border-blue-500 dark:text-gray-300 hover:bg-blue-600 hover:text-white'} text-xs btn shadow-none rounded-full`} onClick={() => dispatch(toggleTheme('dark'))}>
                        <IconMoon className="w-5 h-5 shrink-0 ltr:mr-1 rtl:ml-1" />
                        Dark
                    </button>

                    <button type="button" className={`${themeConfig.theme === 'system' ? 'bg-blue-600 border-0 text-white dark:text-gray-300' : 'border border-blue-600 dark:border-blue-500 dark:text-gray-300 hover:bg-blue-600 hover:text-white'} text-xs btn shadow-none rounded-full`} onClick={() => dispatch(toggleTheme('system'))}>
                        <IconLaptop className="w-5 h-5 shrink-0 ltr:mr-1 rtl:ml-1" />
                        System
                    </button>
                </div>
            </div>

            <div className="border border-dotted border-stone-400 dark:border-gray-400 rounded-2xl mb-3 p-3">
                <h5 className="mb-1 text-base dark:text-white leading-none">Navigation Position</h5>
                <p className="text-dark text-xs dark:text-white-light">Select the primary navigation paradigm for your app.</p>
                <div className="grid grid-cols-3 gap-2 mt-3">
                    <button type="button" className={`${themeConfig.menu === 'horizontal' ? 'bg-blue-600 border-0 text-white dark:text-gray-300' : 'border border-blue-600 dark:border-blue-500 dark:text-gray-300 hover:bg-blue-600 hover:text-white'} p-2.5 text-xs btn shadow-none rounded-full`} onClick={() => dispatch(toggleMenu('horizontal'))}>
                        Horizontal
                    </button>

                    <button type="button" className={`${themeConfig.menu === 'vertical' ? 'bg-blue-600 border-0 text-white dark:text-gray-300' : 'border border-blue-600 dark:border-blue-500 dark:text-gray-300 hover:bg-blue-600 hover:text-white'} p-2.5 text-xs btn shadow-none rounded-full`} onClick={() => dispatch(toggleMenu('vertical'))}>
                        Vertical
                    </button>

                    <button
                        type="button"
                        className={`${themeConfig.menu === 'collapsible-vertical' ? 'bg-blue-600 border-0 text-white dark:text-gray-300' : 'border border-blue-600 dark:border-blue-500 dark:text-gray-300 hover:bg-blue-600 hover:text-white'} p-2.5 text-xs btn shadow-none rounded-full`}
                        onClick={() => dispatch(toggleMenu('collapsible-vertical'))}
                    >
                        Collapsible
                    </button>
                </div>
                <div className="mt-5 text-primary">
                    <label className="inline-flex mb-0">
                        <input
                            type="checkbox"
                            className="form-checkbox border-stone-300 dark:border-stone-500"
                            checked={Boolean(themeConfig.semidark)}
                            onChange={(e) => dispatch(toggleSemidark(e.target.checked))}
                        />
                        <span className='dark:text-gray-300'>Semi Dark (Sidebar & Header)</span>
                    </label>
                </div>
            </div>

            <div className="border border-dotted border-stone-400 dark:border-gray-400 rounded-2xl mb-3 p-2">
                <h5 className="mb-1 text-base dark:text-white leading-none">Layout Style</h5>
                <p className="text-dark text-xs dark:text-white-light">Select the primary layout style for your app.</p>
                <div className="flex gap-2 mt-3">
                    <button
                        type="button"
                        className={`${themeConfig.layout === 'boxed-layout' ? 'bg-blue-600 dark:border-blue-600 text-white dark:text-gray-300' : 'border border-blue-600 dark:border-blue-500 dark:text-gray-300 hover:bg-blue-600 hover:text-white'} btn shadow-none flex-auto text-xs rounded-full`}
                        onClick={() => dispatch(toggleLayout('boxed-layout'))}
                    >
                        Box
                    </button>

                    <button type="button" className={`${themeConfig.layout === 'full' ? 'bg-blue-600 dark:border-blue-600 text-white dark:text-gray-300' : 'border border-blue-600 dark:border-blue-500 dark:text-gray-300 hover:bg-blue-600 hover:text-white'} btn shadow-none flex-auto text-xs rounded-full`} onClick={() => dispatch(toggleLayout('full'))}>
                        Full
                    </button>
                </div>
            </div>

            <div className="border border-dotted border-stone-400 dark:border-gray-400 rounded-2xl mb-3 p-2">
                <h5 className="mb-1 text-base dark:text-white leading-none">Direction</h5>
                <p className="text-dark text-xs dark:text-white-light">Select the direction for your app.</p>
                <div className="flex gap-2 mt-3">
                    <button type="button" className={`${themeConfig.rtlClass === 'ltr' ? 'bg-blue-600 border-0 text-white dark:text-gray-300' : 'border border-blue-600 dark:border-blue-500 dark:text-gray-300 hover:bg-blue-600 hover:text-white'} btn shadow-none flex-auto text-xs rounded-full`} onClick={() => dispatch(toggleRTL('ltr'))}>
                        LTR
                    </button>

                    <button type="button" className={`${themeConfig.rtlClass === 'rtl' ? 'bg-blue-600 border-0 text-white dark:text-gray-300' : 'border border-blue-600 dark:border-blue-500 dark:text-gray-300 hover:bg-blue-600 hover:text-white'} btn shadow-none flex-auto text-xs rounded-full`} onClick={() => dispatch(toggleRTL('rtl'))}>
                        RTL
                    </button>
                </div>
            </div>

            <div className="border border-dotted border-stone-400 dark:border-gray-400 rounded-2xl mb-3 p-2">
                <h5 className="mb-1 text-base dark:text-white leading-none">Navbar Type</h5>
                <p className="text-white-dark text-xs dark:text-white-light">Sticky or Floating.</p>
                <div className="mt-3 flex items-center gap-3 text-primary dark:text-blue-300">
                    <label className="inline-flex mb-0">
                        <input
                            type="radio"
                            checked={themeConfig.navbar === 'navbar-sticky'}
                            value="navbar-sticky"
                            className="form-radio"
                            onChange={() => dispatch(toggleNavbar('navbar-sticky'))}
                        />
                        <span>Sticky</span>
                    </label>
                    <label className="inline-flex mb-0">
                        <input
                            type="radio"
                            checked={themeConfig.navbar === 'navbar-floating'}
                            value="navbar-floating"
                            className="form-radio"
                            onChange={() => dispatch(toggleNavbar('navbar-floating'))}
                        />
                        <span>Floating</span>
                    </label>
                    <label className="inline-flex mb-0">
                        <input
                            type="radio"
                            checked={themeConfig.navbar === 'navbar-static'}
                            value="navbar-static"
                            className="form-radio"
                            onChange={() => dispatch(toggleNavbar('navbar-static'))}
                        />
                        <span>Static</span>
                    </label>
                </div>
            </div>

            <div className="border border-dotted border-stone-400 dark:border-gray-400 rounded-2xl mb-3 p-2">
                <h5 className="mb-1 text-base dark:text-white leading-none">Router Transition</h5>
                <p className="text-white-dark text-xs dark:text-white-light">Animation of main content.</p>
                <div className="mt-3">
                    <select className="form-select border-primary rounded-full text-primary" value={themeConfig.animation} onChange={(e) => dispatch(toggleAnimation(e.target.value))}>
                        <option value=" ">None</option>
                        <option value="animate__fadeIn">Fade</option>
                        <option value="animate__fadeInDown">Fade Down</option>
                        <option value="animate__fadeInUp">Fade Up</option>
                        <option value="animate__fadeInLeft">Fade Left</option>
                        <option value="animate__fadeInRight">Fade Right</option>
                        <option value="animate__slideInDown">Slide Down</option>
                        <option value="animate__slideInLeft">Slide Left</option>
                        <option value="animate__slideInRight">Slide Right</option>
                        <option value="animate__zoomIn">Zoom In</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

export default Setting;
