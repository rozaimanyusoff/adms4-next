'use client';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '@/store';
import { toggleAnimation, toggleLayout, toggleMenu, toggleNavbar, toggleRTL, toggleTheme, toggleSemidark, resetToggleSidebar, togglePrimaryColor } from '@/store/themeConfigSlice';
import IconSettings from '@/components/icon/icon-settings';
import IconX from '@/components/icon/icon-x';
import IconSun from '@/components/icon/icon-sun';
import IconMoon from '@/components/icon/icon-moon';
import IconLaptop from '@/components/icon/icon-laptop';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

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
                    <Button type="button" variant={themeConfig.theme === 'light' ? 'default' : 'outline'} className="flex-auto text-xs " onClick={() => dispatch(toggleTheme('light'))}>
                        <IconSun className="w-4 h-4 shrink-0 ltr:mr-1 rtl:ml-1" />
                        Light
                    </Button>
                    <Button type="button" variant={themeConfig.theme === 'dark' ? 'default' : 'outline'} className="flex-auto text-xs " onClick={() => dispatch(toggleTheme('dark'))}>
                        <IconMoon className="w-4 h-4 shrink-0 ltr:mr-1 rtl:ml-1" />
                        Dark
                    </Button>
                    <Button type="button" variant={themeConfig.theme === 'system' ? 'default' : 'outline'} className="flex-auto text-xs " onClick={() => dispatch(toggleTheme('system'))}>
                        <IconLaptop className="w-4 h-4 shrink-0 ltr:mr-1 rtl:ml-1" />
                        System
                    </Button>
                </div>
            </div>

            {/* Color Theme Selector */}
            <div className="border border-dotted border-stone-400 dark:border-gray-400 rounded-2xl mb-3 p-2">
                <h5 className="mb-1 text-base dark:text-white leading-none">Primary Color</h5>
                <p className="text-dark text-xs font-semibold dark:text-white-light">Choose the primary color for the app.</p>
                <div className="flex gap-2 mt-3">
                    {['blue', 'red', 'green', 'purple', 'orange', 'teal'].map((color) => (
                        <Button
                            key={color}
                            type="button"
                            variant={themeConfig.primaryColor === color ? 'default' : 'outline'}
                            className={`w-8 h-8 p-0 rounded-full border-2 ${themeConfig.primaryColor === color ? 'ring-2 ring-offset-2 ring-' + color + '-500 border-' + color + '-500' : 'border-stone-300'} bg-${color}-500`}
                            aria-label={color.charAt(0).toUpperCase() + color.slice(1)}
                            onClick={() => dispatch(togglePrimaryColor(color))}
                        >
                            {themeConfig.primaryColor === color && (
                                <svg className="w-4 h-4 text-white mx-auto" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            )}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="border border-dotted border-stone-400 dark:border-gray-400 rounded-2xl mb-3 p-3">
                <h5 className="mb-1 text-base dark:text-white leading-none">Navigation Position</h5>
                <p className="text-dark text-xs dark:text-white-light">Select the primary navigation paradigm for your app.</p>
                <div className="grid grid-cols-3 gap-2 mt-3">
                    <Button type="button" variant={themeConfig.menu === 'horizontal' ? 'default' : 'outline'} className="flex-auto text-xs " onClick={() => dispatch(toggleMenu('horizontal'))}>
                        Horizontal
                    </Button>

                    <Button type="button" variant={themeConfig.menu === 'vertical' ? 'default' : 'outline'} className="flex-auto text-xs " onClick={() => dispatch(toggleMenu('vertical'))}>
                        Vertical
                    </Button>

                    <Button
                        type="button"
                        variant={themeConfig.menu === 'collapsible-vertical' ? 'default' : 'outline'}
                        className="flex-auto text-xs "
                        onClick={() => dispatch(toggleMenu('collapsible-vertical'))}
                    >
                        Collapsible
                    </Button>
                </div>
                <div className="mt-5 text-primary">
                    <Label className="inline-flex mb-0 items-center gap-1">
                        <Checkbox
                            checked={Boolean(themeConfig.semidark)}
                            onCheckedChange={(checked) => dispatch(toggleSemidark(checked))}
                            className="border-stone-300 dark:border-stone-500"
                        />
                        <span className='dark:text-gray-300'>Semi Dark (Sidebar & Header)</span>
                    </Label>
                </div>
            </div>

            <div className="border border-dotted border-stone-400 dark:border-gray-400 rounded-2xl mb-3 p-2">
                <h5 className="mb-1 text-base dark:text-white leading-none">Layout Style</h5>
                <p className="text-dark text-xs dark:text-white-light">Select the primary layout style for your app.</p>
                <div className="flex gap-2 mt-3">
                    <Button
                        type="button"
                        variant={themeConfig.layout === 'boxed-layout' ? 'default' : 'outline'}
                        className="flex-auto text-xs "
                        onClick={() => dispatch(toggleLayout('boxed-layout'))}
                    >
                        Box
                    </Button>

                    <Button type="button" variant={themeConfig.layout === 'full' ? 'default' : 'outline'} className="flex-auto text-xs " onClick={() => dispatch(toggleLayout('full'))}>
                        Full
                    </Button>
                </div>
            </div>

            <div className="border border-dotted border-stone-400 dark:border-gray-400 rounded-2xl mb-3 p-2">
                <h5 className="mb-1 text-base dark:text-white leading-none">Direction</h5>
                <p className="text-dark text-xs dark:text-white-light">Select the direction for your app.</p>
                <div className="flex gap-2 mt-3">
                    <Button type="button" variant={themeConfig.rtlClass === 'ltr' ? 'default' : 'outline'} className="flex-auto text-xs " onClick={() => dispatch(toggleRTL('ltr'))}>
                        LTR
                    </Button>
                    <Button type="button" variant={themeConfig.rtlClass === 'rtl' ? 'default' : 'outline'} className="flex-auto text-xs " onClick={() => dispatch(toggleRTL('rtl'))}>
                        RTL
                    </Button>
                </div>
            </div>

            <div className="border border-dotted border-stone-400 dark:border-gray-400 rounded-2xl mb-3 p-2">
                <h5 className="mb-1 text-base dark:text-white leading-none">Navbar Type</h5>
                <p className="text-white-dark text-xs dark:text-white-light">Sticky or Floating.</p>
                <div className="mt-3 flex items-center gap-3 text-primary dark:text-blue-300">
                    <Label className="inline-flex mb-0 items-center gap-1">
                        <Input
                            type="radio"
                            checked={themeConfig.navbar === 'navbar-sticky'}
                            value="navbar-sticky"
                            className="form-radio"
                            onChange={() => dispatch(toggleNavbar('navbar-sticky'))}
                        />
                        <span>Sticky</span>
                    </Label>
                    <Label className="inline-flex mb-0 items-center gap-1">
                        <Input
                            type="radio"
                            checked={themeConfig.navbar === 'navbar-floating'}
                            value="navbar-floating"
                            className="form-radio"
                            onChange={() => dispatch(toggleNavbar('navbar-floating'))}
                        />
                        <span>Floating</span>
                    </Label>
                    <Label className="inline-flex mb-0 items-center gap-1">
                        <Input
                            type="radio"
                            checked={themeConfig.navbar === 'navbar-static'}
                            value="navbar-static"
                            className="form-radio"
                            onChange={() => dispatch(toggleNavbar('navbar-static'))}
                        />
                        <span>Static</span>
                    </Label>
                </div>
            </div>

            <div className="border border-dotted border-stone-400 dark:border-gray-400 rounded-2xl mb-3 p-2">
                <h5 className="mb-1 text-base dark:text-white leading-none">Router Transition</h5>
                <p className="text-white-dark text-xs dark:text-white-light">Animation of main content.</p>
                <div className="mt-3">
                    <Select value={themeConfig.animation} onValueChange={(value) => dispatch(toggleAnimation(value))}>
                        <SelectTrigger className="border-primary  text-primary">
                            <SelectValue placeholder="Select animation" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value=" ">None</SelectItem>
                            <SelectItem value="animate__fadeIn">Fade</SelectItem>
                            <SelectItem value="animate__fadeInDown">Fade Down</SelectItem>
                            <SelectItem value="animate__fadeInUp">Fade Up</SelectItem>
                            <SelectItem value="animate__fadeInLeft">Fade Left</SelectItem>
                            <SelectItem value="animate__fadeInRight">Fade Right</SelectItem>
                            <SelectItem value="animate__slideInDown">Slide Down</SelectItem>
                            <SelectItem value="animate__slideInLeft">Slide Left</SelectItem>
                            <SelectItem value="animate__slideInRight">Slide Right</SelectItem>
                            <SelectItem value="animate__zoomIn">Zoom In</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
};

export default Setting;
