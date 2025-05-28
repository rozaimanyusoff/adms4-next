'use client';

import { Metadata } from 'next';
import Link from 'next/link';
import React, { useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@components/ui/input';
import { Button } from '@components/ui/button';
import { Checkbox } from "@components/ui/checkbox";
import Footer from '@components/layouts/footer';
import { api } from '@/config/api';
import { Eye, EyeOff } from "lucide-react";
import { AuthContext } from '@/store/AuthContext';
import AuthTemplate from './AuthTemplate';

interface LoginResponse {
    token: string;
    data: {
        user: {
            id: number;
            email: string;
            username: string;
            contact: string;
            name: string;
            userType: number;
            status: number;
            lastNav: string;
            role: {
                id: number;
                name: string;
            };
            profile: {
                user_id: number;
                dob: string;
                location: string;
                job: string;
                profile_image_url: string;
            };
        };
        usergroups: Array<{
            id: number;
            name: string;
        }>;
        navTree: Array<{
            navId: number;
            title: string;
            type: string;
            position: number;
            status: number;
            path: string | null;
            parent_nav_id: number | null;
            section_id: number | null;
            children: any[] | null;
        }>;
    };
}

const ComponentLogin = () => {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [responseMessage, setResponseMessage] = useState<string | null>(null);
    const authContext = useContext(AuthContext);

    useEffect(() => {
        // Redirect to lastNav if user is already authenticated
        if (authContext?.authData) {
            const lastNav = authContext.authData.user?.lastNav;
            const redirectPath = lastNav && lastNav.startsWith('/') ? lastNav : '/analytics';
            router.push(redirectPath);
        }
    }, [authContext, router]);

    if (authContext?.authData) {
        // Prevent rendering the login page if the user is authenticated
        return null;
    }

    const getMessageClass = (message: string | null) => {
        if (message?.toLowerCase().includes('error') || message?.toLowerCase().includes('invalid')) {
            return 'text-red-500';
        } else if (message?.toLowerCase().includes('success')) {
            return 'text-green-600';
        } else {
            return 'text-black';
        }
    };

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const emailOrUsername = formData.get('emailOrUsername') as string;
        const password = formData.get('password') as string;

        try {
            const response = await api.post<LoginResponse>('/api/auth/login', { emailOrUsername, password });
            if (response.data.token) {
                if (authContext && authContext.setAuthData) {
                    authContext.setAuthData({
                        token: response.data.token,
                        user: response.data.data.user,
                        usergroups: response.data.data.usergroups,
                        navTree: response.data.data.navTree,
                    });
                } else {
                    console.error('AuthContext is not properly initialized.');
                }

                // Safely access lastNav or fallback to /analytics
                const redirectPath = response.data.data.user?.lastNav?.startsWith('/') ? response.data.data.user.lastNav : '/analytics';
                router.push(redirectPath);
            }
        } catch (error: any) {
            console.error('Login failed:', error);
            const errorMessage = error.response?.data?.message || 'An unexpected error occurred. Please try again.';
            setResponseMessage(errorMessage);
        }
    };

    return (
        <AuthTemplate title="Sign in" description="Login to your ADMS account.">
            <form className="space-y-6" onSubmit={handleLogin}>
                <div>
                    <label htmlFor="emailOrUsername" className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                    <Input id="emailOrUsername" name="emailOrUsername" type="text" required placeholder="Enter your email or username" />
                </div>
                <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
                    <div className="relative">
                        <Input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            required
                            placeholder="Enter your password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-5 text-gray-500"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <label className="flex items-center text-sm text-gray-700 cursor-pointer gap-2">
                        <Checkbox id="rememberMe" name="rememberMe" /> Remember Me
                    </label>
                    <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:underline">Lost your password?</Link>
                </div>
                {responseMessage && (
                    <div className={`text-center text-sm ${getMessageClass(responseMessage)}`}>{responseMessage}</div>
                )}
                <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 rounded transition">Sign in now</Button>
                <div className="text-center mt-4">
                    <span className="text-sm text-gray-700">Not a member? </span>
                    <Link href="/auth/register" className="text-sm text-blue-600 hover:underline font-semibold">Sign up</Link>
                </div>
            </form>
        </AuthTemplate>
    );
};

export default ComponentLogin;