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

    const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const { name, email, contact, userType } = formData;

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

    return (
        <AuthTemplate title="Register" description={responseMessage || "Create your account by filling the form below."}>
            <form className="space-y-6" onSubmit={handleRegister}>
                <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
                    <Input id="name" name="name" type="text" required value={formData.name} onChange={handleChange} placeholder="Enter your full name" />
                </div>
                <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                    <Input id="email" name="email" type="email" required value={formData.email} onChange={handleChange} placeholder="Enter your email" />
                </div>
                <div>
                    <label htmlFor="contact" className="block text-sm font-semibold text-gray-700 mb-1">Contact</label>
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
                    />
                </div>
                <div>
                    <label htmlFor="userType" className="block text-sm font-semibold text-gray-700 mb-1">User Type</label>
                    <Input id="userType" name="userType" type="text" required value={formData.userType} onChange={handleChange} placeholder="Enter user type" />
                </div>
                <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 rounded transition">Register</Button>
                <div className="text-center mt-4">
                    <Link href="/auth/login" className="text-blue-600 hover:underline">Already have an account? Login</Link>
                </div>
            </form>
        </AuthTemplate>
    );
};

export default ComponentRegister;