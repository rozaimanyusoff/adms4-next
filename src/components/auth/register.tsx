'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@components/ui/input';
import { Button } from '@components/ui/button';
import { Textarea } from '@components/ui/textarea';
import AuthTemplate from './AuthTemplate';
import { api } from '@/config/api';
import { CircleHelp } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@components/ui/select';

interface RegisterResponse {
    message: string;
}

interface RegisterPayload {
    name: string;
    email: string;
    contact: string;
    userType: number;
    username: string | null; // Ramco ID for Employee
    about: string | null; // Background for Non-Employee
    ip: string | null;
    userAgent: string | null;
}

const ComponentRegister = () => {
    const router = useRouter();
    const defaultMessage = 'Complete the form below to request access.';
    const [responseMessage, setResponseMessage] = useState<string>(defaultMessage);
    const [responseType, setResponseType] = useState<'default' | 'success' | 'error'>('default');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        contact: '',
        userType: '',
        username: '', // employee Ramco ID
        about: '', // non-employee background info
    });
    const [showUserTypeHelp, setShowUserTypeHelp] = useState(false);
    const [showEmailHelp, setShowEmailHelp] = useState(false);
    const [showContactHelp, setShowContactHelp] = useState(false);

    const getClientIp = async (): Promise<string | null> => {
        const ipApis = [
            'https://api.ipify.org?format=json',
            'https://ipv4.icanhazip.com',
        ];

        for (const url of ipApis) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 2500);
                const res = await fetch(url, { signal: controller.signal });
                clearTimeout(timeout);
                if (!res.ok) continue;

                if (url.includes('ipify')) {
                    const data = await res.json();
                    if (data?.ip && typeof data.ip === 'string') return data.ip;
                } else {
                    const text = (await res.text()).trim();
                    if (text) return text;
                }
            } catch {
                // Fallback to next endpoint; IP is optional
            }
        }

        return null;
    };

    const handleChange = (e: { target: { id: string; value: string } }) => {
        const { id, value } = e.target;
        const sanitizedValue = id === 'contact' ? value.replace(/\D/g, '') : value;
        setFormData((prevData) => ({
            ...prevData,
            [id]: sanitizedValue,
        }));
    };

    const isCompanyEmail = (email: string) => {
        // Not a public domain
        return !/(@gmail|@yahoo|@hotmail|@outlook)\./i.test(email);
    };

    const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const { name, email, contact, userType, username, about } = formData;
        if (!name.trim()) {
            setResponseType('error');
            setResponseMessage('Please enter your full name.');
            return;
        }
        if (!/^[a-zA-Z\s'.-]+$/.test(name)) {
            setResponseType('error');
            setResponseMessage('Use a valid full name.');
            return;
        }
        if (!email.trim()) {
            setResponseType('error');
            setResponseMessage('Please enter your email.');
            return;
        }
        if (userType === '1' && !isCompanyEmail(email)) {
            setResponseType('error');
            setResponseMessage('Please use your company email for Employee registration.');
            return;
        }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
            setResponseType('error');
            setResponseMessage('Enter a valid email address.');
            return;
        }
        if (!contact.trim()) {
            setResponseType('error');
            setResponseMessage('Please enter your contact number.');
            return;
        }
        if (!/^[0-9]{10,11}$/.test(contact)) {
            setResponseType('error');
            setResponseMessage('Contact must be 10-11 digits.');
            return;
        }
        if (userType === '1' && !username.trim()) {
            setResponseType('error');
            setResponseMessage('Please enter your Ramco ID.');
            return;
        }
        if (userType === '2' && !about.trim()) {
            setResponseType('error');
            setResponseMessage('Please tell us more about yourself.');
            return;
        }

        try {
            const isEmployee = userType === '1';
            const ip = await getClientIp();
            const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;
            const payload: RegisterPayload = {
                name: name.trim(),
                email: email.trim().toLowerCase(),
                contact: contact.trim(),
                userType: Number(userType),
                username: isEmployee ? username.trim() : null,
                about: isEmployee ? null : about.trim(),
                ip,
                userAgent,
            };
            const response = await api.post<RegisterResponse>('/api/auth/register', payload);
            if (response.data.message || (response as any)?.data?.status === 'success') {
                setResponseType('success');
                setResponseMessage(response.data.message || 'Registration successful.');
                setTimeout(() => router.push('/auth/login'), 2200);
            }
        } catch (error: any) {
            console.error('Registration failed:', error);
            setResponseType('error');
            setResponseMessage(error?.response?.data?.message || 'Registration failed. Please try again.');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const charCode = e.key;
        if (!/^[0-9]$/.test(charCode)) {
            e.preventDefault();
        }
    };

    return (
        <AuthTemplate
            title="Request for Access"
            description={responseMessage || defaultMessage}
            descriptionClassName={
                responseType === 'success'
                    ? 'mb-6 text-center text-green-300 font-semibold text-xs'
                    : responseType === 'error'
                        ? 'mb-6 text-center text-yellow-200 font-semibold text-xs'
                        : 'mb-6 text-center text-sm text-white/75'
            }
        >
            <form className="space-y-6" onSubmit={handleRegister}>
                <div className="relative">
                    <Select
                        value={formData.userType}
                        onValueChange={value => {
                            setFormData(prev => ({ ...prev, userType: value }));
                            setShowUserTypeHelp(false);
                        }}
                    >
                        <SelectTrigger
                            id="userType"
                            name="userType"
                            className="w-full pr-16 border-white/40 bg-white/10 text-white focus-visible:ring-white/45 focus-visible:border-white/70 data-placeholder:text-white/70"
                        >
                            <SelectValue placeholder="Select user type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">Employee</SelectItem>
                            <SelectItem value="2">Non-Employee</SelectItem>
                        </SelectContent>
                    </Select>
                    <button
                        type="button"
                        aria-label="User type help"
                        onClick={() => setShowUserTypeHelp(prev => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-white/80 hover:text-white transition"
                    >
                        <CircleHelp className="size-4" />
                    </button>
                    {showUserTypeHelp && (
                        <div className="absolute right-0 top-full mt-2 z-20 w-64 rounded-md border border-white/25 bg-slate-900/95 text-white text-xs px-3 py-2 shadow-lg">
                            Select non-employee if you are an agent or protege
                        </div>
                    )}
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
                            onChange={handleChange}
                            placeholder="Enter your full name"
                            disabled={!formData.userType}
                            className='capitalize'
                        />
                    </div>
                </div>
                <div className="relative">
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
                        className="pr-10"
                    />
                    <button
                        type="button"
                        aria-label="Email help"
                        onClick={() => setShowEmailHelp(prev => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-white/80 hover:text-white transition"
                    >
                        <CircleHelp className="size-4" />
                    </button>
                    {showEmailHelp && (
                        <div className="absolute right-0 top-full mt-2 z-20 w-72 rounded-md border border-white/25 bg-slate-900/95 text-white text-xs px-3 py-2 shadow-lg">
                            Prefer using your personal email. If you already have a company email, you can use that too.
                        </div>
                    )}
                </div>
                <div className="relative">
                    <Input
                        variant="translucent"
                        id="contact"
                        name="contact"
                        type="text"
                        required
                        placeholder="Enter your contact"
                        pattern="[0-9]*"
                        maxLength={11}
                        value={formData.contact}
                        onChange={handleChange}
                        onKeyPress={handleKeyPress}
                        disabled={!formData.email.trim()}
                        className="pr-10"
                    />
                    <button
                        type="button"
                        aria-label="Contact help"
                        onClick={() => setShowContactHelp(prev => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-white/80 hover:text-white transition"
                    >
                        <CircleHelp className="size-4" />
                    </button>
                    {showContactHelp && (
                        <div className="absolute right-0 top-full mt-2 z-20 w-72 rounded-md border border-white/25 bg-slate-900/95 text-white text-xs px-3 py-2 shadow-lg">
                            Provide a valid contact number that admin can reach to verify your registration.
                        </div>
                    )}
                </div>
                {formData.userType === '1' && (
                    <div className="space-y-1">
                        <Input
                            variant="translucent"
                            id="username"
                            name="username"
                            type="text"
                            value={formData.username}
                            onChange={handleChange}
                            maxLength={6}
                            placeholder="Enter your Ramco ID"
                            disabled={!formData.contact.trim()}
                        />
                    </div>
                )}
                {formData.userType === '2' && (
                    <div className="space-y-1">
                        <Textarea
                            id="about"
                            name="about"
                            value={formData.about}
                            onChange={handleChange}
                            rows={4}
                            placeholder="Tell us more about who you are and why you need access (e.g., Saya adalah Protege/Agent dari Jabatan NRW. Mula bekerja pada Januari 2020 sebagai...)."
                            className="border-white/40 bg-white/10 text-white placeholder:text-white/60 focus-visible:ring-white/45 focus-visible:border-white/70"
                            disabled={!formData.contact.trim()}
                        />
                    </div>
                )}

                {/* Captcha disabled temporarily */}
                <Button
                    type="submit"
                    size="default"
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 rounded transition"
                    disabled={!((formData.name.trim() && formData.email.trim() && formData.contact.trim() && formData.userType) &&
                        (formData.userType === '1' ? !!formData.username.trim() : !!formData.about.trim()))}
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
