'use client';

import { Metadata } from 'next';
import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@components/ui/input';
import { Button } from '@components/ui/button';
import AuthTemplate from './AuthTemplate';
import Footer from '@components/layouts/footer';
import { api } from '@/config/api';
import { Eye, EyeOff } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@components/ui/select';

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
    const [employeeFullName, setEmployeeFullName] = useState<string>('');
    const [nameLocked, setNameLocked] = useState<boolean>(false);
    // Captcha temporarily disabled; rely on RAMCO validation instead

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
    useEffect(() => {
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
                const res = await api.post<{ status: string; message?: string; data?: { matched?: boolean; ramco_id?: string; confidence?: string; employee_full_name?: string } }>(
                    '/api/auth/register/verifyme',
                    { name: formData.name.trim(), email: formData.email.trim(), contact: formData.contact.trim() }
                );

                if (!cancelled) {
                    if (res.data.status === 'success' && res.data.data?.matched && res.data.data?.ramco_id) {
                        setMatched(true);
                        setServerRamcoId(res.data.data.ramco_id);
                        setEmployeeFullName(res.data.data.employee_full_name || formData.name);
                        setResponseMessage('Employee verified. Please confirm your Ramco ID.');
                    } else {
                        setMatched(false);
                        setServerRamcoId('');
                        setEmployeeFullName('');
                        setVerifyError(res.data.message || 'Could not verify employee. Please check your details.');
                    }
                }
            } catch (err: any) {
                if (!cancelled) {
                    setMatched(false);
                    setServerRamcoId('');
                    setEmployeeFullName('');
                    setVerifyError(err.response?.data?.message || 'Verification failed. Please try again later.');
                }
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

    // Auto-fill name when Ramco ID matches server-provided ID
    useEffect(() => {
        if (formData.userType === '1' && matched && formData.username === serverRamcoId && serverRamcoId && employeeFullName) {
            const clean = employeeFullName.trim();
            if (formData.name !== clean) {
                setFormData(prev => ({ ...prev, name: clean }));
            }
            setNameLocked(true);
        } else {
            setNameLocked(false);
        }
    }, [formData.userType, matched, formData.username, serverRamcoId, employeeFullName]);

    return (
        <AuthTemplate title="Register" description={responseMessage || "Create your account by filling the form below"}>
            <form className="space-y-6" onSubmit={handleRegister}>
                <div>
                    <Select
                        value={formData.userType}
                        onValueChange={value => setFormData(prev => ({ ...prev, userType: value }))}
                    >
                        <SelectTrigger
                            id="userType"
                            name="userType"
                            className="w-full border-white/40 bg-white/10 text-white focus-visible:ring-white/45 focus-visible:border-white/70 data-[placeholder]:text-white/70"
                        >
                            <SelectValue placeholder="Select user type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">Employee</SelectItem>
                            <SelectItem value="2">Non-Employee</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <div className="relative">
                        <Input
                            variant="translucent"
                            id="name"
                            name="name"
                            type="text"
                            required
                            value={formData.name}
                            onChange={e => { if (!nameLocked) handleChange(e); }}
                            placeholder="Enter your full name"
                            disabled={!formData.userType || nameLocked}
                            className={nameLocked ? 'pr-24' : ''}
                        />
                        {nameLocked && (
                            <span className="absolute top-1/2 -translate-y-1/2 right-2 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded border border-green-300 font-medium">
                                verified
                            </span>
                        )}
                    </div>
                    {fieldErrors.name && <div className="text-xs text-red-600 mt-1">{fieldErrors.name}</div>}
                </div>
                <div>
                    <Input
                        variant="translucent"
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Enter your email"
                        disabled={!formData.name.trim() || !formData.userType}
                    />
                    {fieldErrors.email && <div className="text-xs text-red-600 mt-1">{fieldErrors.email}</div>}
                </div>
                <div>
                    <Input
                        variant="translucent"
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
                        disabled={!formData.email.trim()}
                    />
                    {fieldErrors.contact && <div className="text-xs text-red-600 mt-1">{fieldErrors.contact}</div>}
                </div>
                {formData.userType === '1' && matched && (
                    <div className="space-y-1">
                        <Input
                            variant="translucent"
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
                        {verifying && <div className="text-xs text-white/70">Re-verifying...</div>}
                        {verifyError && !matched && <div className="text-xs text-red-600">{verifyError}</div>}
                    </div>
                )}
                {formData.userType === '1' && !matched && (formData.name || formData.email || formData.contact) && (
                    <div className="text-xs text-white/70 -mt-2">
                        {verifying ? 'Verifying employee details...' : (verifyError || 'Fill all fields to verify as employee.')}
                    </div>
                )}

                {/* Captcha disabled temporarily */}
                <Button
                    type="submit"
                    size="default"
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 rounded transition"
                    disabled={!((formData.name.trim() && formData.email.trim() && formData.contact.trim() && formData.userType) &&
                        (formData.userType !== '1' ? true : (matched && formData.username === serverRamcoId && !!serverRamcoId)))}
                >
                    Register
                </Button>
                <div className="text-center mt-4">
                    <Link href="/auth/login" className="text-blue-300 hover:text-blue-200 text-sm hover:underline underline-offset-4">Already have an account? Login</Link>
                </div>
            </form>
        </AuthTemplate>
    );
};

export default ComponentRegister;
