'use client';

import { Metadata } from 'next';
import Link from 'next/link';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@components/ui/input';
import { Button } from '@components/ui/button';
import AuthTemplate from './AuthTemplate';
import Footer from '@components/layouts/footer';
import { api } from '@/config/api';
import SliderPuzzleCaptcha from './SliderPuzzleCaptcha';
import { Eye, EyeOff } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@components/ui/select';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@components/ui/tooltip';


interface RegisterResponse {
    message: string;
}

const ComponentRegister = () => {
    const router = useRouter();
    const [responseMessage, setResponseMessage] = useState<string | null>('Create your account by filling the form below');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        contact: '',
        userType: '',
        username: '', // employee Ramco ID after verification
    });
    const [verifying, setVerifying] = useState(false);
    const [matched, setMatched] = useState(false); // backend matched (name+email+contact)
    const [verifyError, setVerifyError] = useState<string | null>(null);
    const [serverRamcoId, setServerRamcoId] = useState<string>('');
    const [sliderVerified, setSliderVerified] = useState(false);

    const handleChange = (e: { target: { id: string; value: string } }) => {
        const { id, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [id]: value,
        }));
    };

    const isCompanyEmail = (email: string) => {
        // Not a public domain
        return !/(@gmail|@yahoo|@hotmail|@outlook)\./i.test(email);
    };

    const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; contact?: string }>({});

    const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const { name, email, contact, userType, username } = formData;
        let errors: typeof fieldErrors = {};
        if (!name.trim()) errors.name = 'Please enter your full name.';
        if (!/^[a-zA-Z\s'.-]+$/.test(name)) errors.name = 'Use a valid full name.';
        if (!email.trim()) errors.email = 'Please enter your email.';
        if (userType === '1' && !isCompanyEmail(email)) errors.email = 'Please use your company email for Employee registration.';
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.email = 'Enter a valid email address.';
        if (!contact.trim()) errors.contact = 'Please enter your contact number.';
        if (!/^[0-9]{8,12}$/.test(contact)) errors.contact = 'Contact must be 8-12 digits.';
        // Optionally, require username for Employee
        // if (userType === '1' && !username.trim()) errors.username = 'Please provide your Ramco ID.';
        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) return;

        try {
            const isEmployee = userType === '1';
            const payload: any = { name, email, contact, userType };
            if (isEmployee) {
                payload.username = username; // Employee can login with username (Ramco ID) OR email
            }
            const response = await api.post<RegisterResponse>('/api/auth/register', payload);
            if (response.data.message) {
                const successMsg = isEmployee
                    ? 'Registration successful! You may login using your Ramco ID or email.'
                    : 'Registration successful! You may login using your email.';
                setResponseMessage(successMsg);
                setTimeout(() => router.push('/auth/login'), 2200);
            }
        } catch (error) {
            console.error('Registration failed:', error);
            setResponseMessage('Registration failed. Please try again.');
        }
    };

    // Auto verification effect: trigger when contact changes and prerequisites filled
    React.useEffect(() => {
        const ready = formData.userType === '1' && formData.name.trim() && formData.email.trim() && formData.contact.trim();
        if (!ready) {
            setMatched(false);
            setServerRamcoId('');
            if (formData.username) setFormData(p => ({ ...p, username: '' }));
            return;
        }
        let cancelled = false;
        setVerifying(true);
        setVerifyError(null);
        const t = setTimeout(async () => {
            try {
                const res = await api.post<{ status: string; message?: string; data?: { matched?: boolean; ramco_id?: string; confidence?: string } }>(
                    '/api/auth/register/verifyme',
                    { name: formData.name, email: formData.email, contact: formData.contact }
                );
                if (cancelled) return;
                if (res.data?.status === 'success' && res.data?.data?.matched && res.data.data.ramco_id) {
                    setMatched(true);
                    setServerRamcoId(String(res.data.data.ramco_id));
                } else {
                    setMatched(false);
                    setServerRamcoId('');
                    setVerifyError(res.data?.message || 'Verification failed: details not matched');
                }
            } catch (err: any) {
                if (cancelled) return;
                setMatched(false);
                setServerRamcoId('');
                setVerifyError(err?.response?.data?.message || 'Server error during verification');
            } finally {
                if (!cancelled) setVerifying(false);
            }
        }, 500); // debounce
        return () => { cancelled = true; clearTimeout(t); };
    }, [formData.userType, formData.name, formData.email, formData.contact]);

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const charCode = e.key;
        if (!/^[0-9]$/.test(charCode)) {
            e.preventDefault();
        }
    };

    const [nameTooltipOpen, setNameTooltipOpen] = useState(false);
    const [emailTooltipOpen, setEmailTooltipOpen] = useState(false);
    const [contactTooltipOpen, setContactTooltipOpen] = useState(false);
    const [userTypeTooltipOpen, setUserTypeTooltipOpen] = useState(false);

    return (
        <TooltipProvider>
            <AuthTemplate title="Register" description={responseMessage || "Create your account by filling the form below."}>
                <form className="space-y-6" onSubmit={handleRegister}>
                    {/* User Type moved to top */}
                    <div>
                        <Tooltip open={userTypeTooltipOpen} onOpenChange={setUserTypeTooltipOpen} delayDuration={0}>
                            <TooltipTrigger asChild>
                                <div tabIndex={0} onFocus={() => setUserTypeTooltipOpen(true)} onBlur={() => setUserTypeTooltipOpen(false)}>
                                    <Select
                                        value={formData.userType}
                                        onValueChange={value => setFormData(prev => ({ ...prev, userType: value }))}
                                    >
                                        <SelectTrigger id="userType" name="userType" className="w-full">
                                            <SelectValue placeholder="Select user type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">Employee</SelectItem>
                                            <SelectItem value="2">Non-Employee</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-wrap">
                                Employees must use their company email. This helps admin approve your registration.
                            </TooltipContent>
                        </Tooltip>
                    </div>
                    <div>
                        <Tooltip open={nameTooltipOpen} onOpenChange={setNameTooltipOpen} delayDuration={0}>
                            <TooltipTrigger asChild>
                                <Input
                                    id="name"
                                    name="name"
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Enter your full name"
                                    onFocus={() => setNameTooltipOpen(true)}
                                    onBlur={() => setNameTooltipOpen(false)}
                                    disabled={!formData.userType}
                                />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-wrap">
                                Please use your real full name for admin approval.
                            </TooltipContent>
                        </Tooltip>
                        {fieldErrors.name && <div className="text-xs text-red-600 mt-1">{fieldErrors.name}</div>}
                    </div>
                    <div>
                        <Tooltip open={emailTooltipOpen} onOpenChange={setEmailTooltipOpen} delayDuration={0}>
                            <TooltipTrigger asChild>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="Enter your email"
                                    onFocus={() => setEmailTooltipOpen(true)}
                                    onBlur={() => setEmailTooltipOpen(false)}
                                    disabled={!formData.name.trim() || !formData.userType}
                                />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-wrap">
                                Use a valid email. Employees must use their company email (not Gmail/Yahoo/Hotmail).
                            </TooltipContent>
                        </Tooltip>
                        {fieldErrors.email && <div className="text-xs text-red-600 mt-1">{fieldErrors.email}</div>}
                    </div>
                    <div>
                        <Tooltip open={contactTooltipOpen} onOpenChange={setContactTooltipOpen} delayDuration={0}>
                            <TooltipTrigger asChild>
                                <Input
                                    id="contact"
                                    name="contact"
                                    type="text"
                                    required
                                    placeholder="Enter your contact"
                                    pattern="[0-9]*"
                                    maxLength={12}
                                    value={formData.contact}
                                    onChange={handleChange}
                                    onKeyPress={handleKeyPress}
                                    onFocus={() => setContactTooltipOpen(true)}
                                    onBlur={() => setContactTooltipOpen(false)}
                                    disabled={!formData.email.trim()}
                                />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-wrap">
                                Enter your contact number (8-12 digits, numbers only).
                            </TooltipContent>
                        </Tooltip>
                        {fieldErrors.contact && <div className="text-xs text-red-600 mt-1">{fieldErrors.contact}</div>}
                    </div>
                    {formData.userType === '1' && matched && (
                        <div className="space-y-1">
                            <Input
                                id="username"
                                name="username"
                                type="text"
                                value={formData.username}
                                onChange={handleChange}
                                maxLength={serverRamcoId.length || 12}
                                placeholder="Enter your Ramco ID"
                            />
                            {formData.username && formData.username !== serverRamcoId && (
                                <div className="text-xs text-red-600">Ramco ID must match verified record.</div>
                            )}
                            {formData.username && formData.username === serverRamcoId && (
                                <div className="text-xs text-green-600 font-semibold">Ramco ID matched.</div>
                            )}
                            {verifying && <div className="text-xs text-gray-500">Re-verifying...</div>}
                            {verifyError && !matched && <div className="text-xs text-red-600">{verifyError}</div>}
                        </div>
                    )}
                    {formData.userType === '1' && !matched && (formData.name || formData.email || formData.contact) && (
                        <div className="text-xs text-gray-500 -mt-2">{verifying ? 'Verifying employee details...' : (verifyError || 'Fill all fields to verify as employee.')}</div>
                    )}
                    {/* Show slider only when all required fields are filled */}
                    {(
                        formData.name.trim() &&
                        formData.email.trim() &&
                        formData.contact.trim() &&
                        formData.userType &&
                        (formData.userType !== '1' ? true : (matched && formData.username === serverRamcoId && !!serverRamcoId))
                    ) ? (
                        <>
                            <div className="flex justify-center items-center w-full my-4">
                                <SliderPuzzleCaptcha onSuccess={() => setSliderVerified(true)} />
                            </div>
                            <div className="text-center text-xs text-gray-500 mb-2">Slide the handle to join the word <b>RTSB</b> and verify you are not a robot.</div>
                        </>
                    ) : null}
                    <Button
                        type="submit"
                        size="default"
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 rounded transition"
                        disabled={!(sliderVerified && (formData.userType !== '1' ? true : (matched && formData.username === serverRamcoId && !!serverRamcoId)))}
                    >
                        Register
                    </Button>
                    <div className="text-center mt-4">
                        <Link href="/auth/login" className="text-blue-600 hover:underline">Already have an account? Login</Link>
                    </div>
                </form>
            </AuthTemplate>
        </TooltipProvider>
    );
};

export default ComponentRegister;