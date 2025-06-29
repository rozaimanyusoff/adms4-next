'use client';

import { useState, useEffect } from 'react';
import { api } from '@/config/api';
import { useRouter, useSearchParams } from 'next/navigation';
import { validatePassword } from '@/lib/passwordValidator';
import Link from 'next/link';
import Footer from '@components/layouts/footer';
import { Input } from '@components/ui/input';
import { Button } from '@components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Eye, EyeOff } from 'lucide-react';
import AuthTemplate from './AuthTemplate';

const decodeResetToken = (token: string) => {
    try {
        const [payloadBase64] = token.split('-');
        const decodedString = Buffer.from(payloadBase64, 'base64').toString();
        const payload = JSON.parse(decodedString);

        return {
            email: payload.e || '',
            contact: payload.c || '',
            expiry: payload.x || 0,
            valid: payload.x ? parseInt(payload.x) > Date.now() : false,
        };
    } catch (error) {
        console.error('Token decode error:', error);
        return {
            email: '',
            contact: '',
            expiry: 0,
            valid: false,
        };
    }
};

const verifyResetToken = async (token: string): Promise<VerifyResponse> => {
    try {
        const response = await api.post('/api/auth/verifytoken', { token });
        return response.data as VerifyResponse; // Explicitly cast response.data to VerifyResponse
    } catch (error: any) {
        console.error('Error verifying token:', error);
        return { valid: false, message: error.response?.data?.message || 'Error verifying token' };
    }
};

interface VerifyResponse {
    valid: boolean;
    message?: string;
    email?: string;
    contact?: string;
}

const ComponentResetPassword = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const resetToken = searchParams.get('token');

    const [formData, setFormData] = useState({
        email: '',
        contact: '',
        password: '',
        confirmPassword: '',
    });
    const [isValidated, setIsValidated] = useState(false);
    const [responseMessage, setResponseMessage] = useState({
        text: 'Enter your email and contact number for verification',
        type: 'default',
    });
    const [fieldErrors, setFieldErrors] = useState({
        email: false,
        contact: false,
        password: false,
        confirmPassword: false,
    });
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'contact') {
            // Only allow numeric input
            const numericValue = value.replace(/\D/g, '');
            setFormData((prev) => ({
                ...prev,
                [name]: numericValue,
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                [name]: value,
            }));
        }
    };

    const handleValidationSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFieldErrors({ email: false, contact: false, password: false, confirmPassword: false });

        if (!resetToken) {
            setResponseMessage({
                text: 'Invalid reset link',
                type: 'error',
            });
            return;
        }

        const verifyResponse = await verifyResetToken(resetToken);

        if (!verifyResponse.valid) {
            setResponseMessage({
                text: verifyResponse.message || 'Reset link is invalid or expired',
                type: 'error',
            });
            return;
        }

        if (
            formData.email.toLowerCase() !== verifyResponse.email?.toLowerCase() ||
            formData.contact !== verifyResponse.contact
        ) {
            setFieldErrors({
                email: formData.email.toLowerCase() !== verifyResponse.email?.toLowerCase(),
                contact: formData.contact !== verifyResponse.contact,
                password: false,
                confirmPassword: false,
            });

            setResponseMessage({
                text: 'Invalid credentials. Please try again.',
                type: 'error',
            });
            return;
        }

        setIsValidated(true);
        setResponseMessage({
            text: 'Identity verified. Please set your new password.',
            type: 'success',
        });
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const charCode = e.key;
        if (!/^[0-9]$/.test(charCode)) {
            e.preventDefault();
        }
    };

        // Password complexity validation function
    function isPasswordComplex(password: string) {
        // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password);
    }

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFieldErrors({ email: false, contact: false, password: false, confirmPassword: false });

        if (!isPasswordComplex(formData.password)) {
            setFieldErrors((prev) => ({ ...prev, password: true }));
            setResponseMessage({
                text: 'Password must be at least 8 characters, include uppercase, lowercase, number, and special character.',
                type: 'error',
            });
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setFieldErrors((prev) => ({ ...prev, password: true, confirmPassword: true }));
            setResponseMessage({
                text: 'Passwords do not match',
                type: 'error',
            });
            return;
        }

        try {
            const response = await api.post('/api/auth/update-password', {
                token: resetToken,
                email: formData.email,
                contact: formData.contact,
                newPassword: formData.password,
            });

            setResponseMessage({
                text: 'Password reset successful! Redirecting to login...',
                type: 'success',
            });

            setTimeout(() => {
                router.push('/auth/login');
            }, 3000);
        } catch (error: any) {
            setResponseMessage({
                text: error.response?.data?.message || 'Error resetting password',
                type: 'error',
            });
        }
    };

    return (
        <AuthTemplate title="Reset Password" description={responseMessage.text || "Enter your new password to reset your account password."}>
            {!isValidated ? (
                <form className="space-y-6" onSubmit={handleValidationSubmit}>
                    <div>
                        <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            required
                            placeholder="Enter your email"
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label htmlFor="contact" className="block text-sm font-semibold text-gray-700 mb-1">Contact</label>
                        <Input
                            id="contact"
                            name="contact"
                            type="text"
                            required
                            placeholder="Enter your contact number"
                            onChange={handleChange}
                            inputMode='numeric'
                            onKeyPress={handleKeyPress}
                        />
                    </div>
                    <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 rounded transition">Verify Identity</Button>
                    <div className="text-center mt-4">
                        <Link href="/auth/login" className="text-blue-600 hover:underline">Back to Login</Link>
                    </div>
                </form>
            ) : (
                <form className="space-y-6" onSubmit={handlePasswordSubmit}>
                    <div>
                        <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            name="password"
                                            type={showPassword ? "text" : "password"}
                                            required
                                            placeholder="Enter your new password"
                                            onChange={handleChange}
                                        />
                                        <span
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 flex items-center pr-5 text-gray-500"
                                            tabIndex={0}
                                            aria-label="Show/hide password"
                                        >
                                            {showPassword ? <EyeOff /> : <Eye />}
                                        </span>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className='max-w-xs text-wrap'>
                                    Password must be at least 8 characters, include uppercase, lowercase, number, and special character.
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-1">Confirm Password</label>
                        <div className="relative">
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                type={showPassword ? "text" : "password"}
                                required
                                placeholder="Confirm your new password"
                                onChange={handleChange}
                            />
                            <span
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 flex items-center pr-5 text-gray-500"
                                tabIndex={0}
                                aria-label="Show/hide password"
                            >
                                {showPassword ? <EyeOff /> : <Eye />}
                            </span>
                        </div>
                    </div>
                    <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 rounded transition">Reset Password</Button>
                    <div className="text-center mt-4">
                        <Link href="/auth/login" className="text-blue-600 hover:underline">Back to Login</Link>
                    </div>
                </form>
            )}
        </AuthTemplate>
    );
};

export default ComponentResetPassword;