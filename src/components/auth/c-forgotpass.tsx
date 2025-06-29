'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@components/ui/input';
import { Button } from '@components/ui/button';
import Footer from '@components/layouts/footer';
import { api } from '@/config/api';
import AuthTemplate from './AuthTemplate';
import { Eye, EyeOff } from 'lucide-react';

const ComponentForgotPassword = () => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [contact, setContact] = useState('');
    const [responseMessage, setResponseMessage] = useState({
        text: 'Enter your email to reset your password',
        type: 'info',
    });
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setResponseMessage({ text: 'Processing...', type: 'info' });

            await api.post('/api/auth/reset-password', { email, contact });

            setResponseMessage({
                text: 'Password reset link sent! Please check your email.',
                type: 'success',
            });
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Failed to send reset link';
            setResponseMessage({ text: errorMessage, type: 'error' });
        }
    };

    return (
        <AuthTemplate title="Forgot Password" description={responseMessage.text || "Enter your email to reset your password."}>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                    <Input id="email" name="email" type="email" required value={email} onChange={handleChange} placeholder="Enter your email" />
                </div>
                {/* Add contact field if needed */}
                <div>
                    <label htmlFor="contact" className="block text-sm font-semibold text-gray-700 mb-1">Contact</label>
                    <Input id="contact" name="contact" type="text" value={contact} onChange={e => setContact(e.target.value)} placeholder="Enter your contact" />
                </div>
                <Button type="submit" size={'default'} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 rounded transition">Send Reset Link</Button>
                <div className="text-center mt-4">
                    <Link href="/auth/login" className="text-blue-600 hover:underline">Back to Login</Link>
                </div>
            </form>
        </AuthTemplate>
    );
};

export default ComponentForgotPassword;