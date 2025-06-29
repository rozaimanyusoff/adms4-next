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
    });

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
        const { name, email, contact, userType } = formData;
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
            const response = await api.post<RegisterResponse>('/api/auth/register', { name, email, contact, userType });
            if (response.data.message) {
                setResponseMessage('Registration successful! Please log in.');
                setTimeout(() => router.push('/auth/login'), 2000); // Redirect to login page after 2 seconds
            }
        } catch (error) {
            console.error('Registration failed:', error);
            setResponseMessage('Registration failed. Please try again.');
        }
    };

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
                <div>
                    <Tooltip open={nameTooltipOpen} onOpenChange={setNameTooltipOpen} delayDuration={0}>
                        <TooltipTrigger asChild>
                            <Input id="name" name="name" type="text" required value={formData.name} onChange={handleChange} placeholder="Enter your full name"
                                onFocus={() => setNameTooltipOpen(true)}
                                onBlur={() => setNameTooltipOpen(false)}
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
                            <Input id="email" name="email" type="email" required value={formData.email} onChange={handleChange} placeholder="Enter your email"
                                onFocus={() => setEmailTooltipOpen(true)}
                                onBlur={() => setEmailTooltipOpen(false)}
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
                            />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-wrap">
                            Enter your contact number (8-12 digits, numbers only).
                        </TooltipContent>
                    </Tooltip>
                    {fieldErrors.contact && <div className="text-xs text-red-600 mt-1">{fieldErrors.contact}</div>}
                </div>
                <div>
                    <Tooltip open={userTypeTooltipOpen} onOpenChange={setUserTypeTooltipOpen} delayDuration={0}>
                        <TooltipTrigger asChild>
                            <div tabIndex={0} onFocus={() => setUserTypeTooltipOpen(true)} onBlur={() => setUserTypeTooltipOpen(false)}>
                                <Select value={formData.userType} onValueChange={value => setFormData(prev => ({ ...prev, userType: value }))}>
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
                <Button type="submit" size="default" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 rounded transition">Register</Button>
                <div className="text-center mt-4">
                    <Link href="/auth/login" className="text-blue-600 hover:underline">Already have an account? Login</Link>
                </div>
            </form>
        </AuthTemplate>
        </TooltipProvider>
    );
};

export default ComponentRegister;