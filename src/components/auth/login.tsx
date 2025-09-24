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
import CredentialSecurity from '@/utils/credentialSecurity';

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
    const [rememberMe, setRememberMe] = useState(false);
    const [credentials, setCredentials] = useState({ emailOrUsername: '', password: '' });
    const [showSecurityWarning, setShowSecurityWarning] = useState(false);
    const authContext = useContext(AuthContext);

    useEffect(() => {
        // Redirect to lastNav if user is already authenticated
        if (authContext?.authData) {
            const lastNav = authContext.authData.user?.lastNav;
            const redirectPath = lastNav && lastNav.startsWith('/') ? lastNav : '/users/profile';
            router.push(redirectPath);
        }

        // Load remembered credentials
        const loadRememberedCredentials = () => {
            console.log('🔍 Loading remembered credentials...');
            try {
                const remembered = localStorage.getItem('rememberedCredentials');
                console.log('📋 Found in localStorage:', remembered ? 'Yes' : 'No');

                if (remembered) {
                    const parsed = JSON.parse(remembered);
                    console.log('📄 Parsed data:', {
                        hasUsername: !!parsed.username,
                        hasToken: !!parsed.token,
                        timestamp: parsed.timestamp,
                        deviceFingerprint: parsed.deviceFingerprint ? 'Present' : 'Missing'
                    });

                    // Check if credentials are not too old (e.g., 7 days for security)
                    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds (reduced from 30)
                    const age = Date.now() - (parsed.timestamp || 0);

                    console.log('⏰ Credential age:', Math.round(age / (24 * 60 * 60 * 1000)), 'days');

                    if (age > maxAge) {
                        localStorage.removeItem('rememberedCredentials');
                        console.log('🗑️ Remembered credentials expired, cleared');
                        return;
                    }

                    // Verify device fingerprint for security
                    const currentFingerprint = CredentialSecurity.getDeviceFingerprint();
                    if (parsed.deviceFingerprint && parsed.deviceFingerprint !== currentFingerprint) {
                        localStorage.removeItem('rememberedCredentials');
                        console.log('� Device fingerprint mismatch, cleared credentials for security');
                        return;
                    }

                    // Only remember username, not password for security
                    if (parsed.username) {
                        console.log('✅ Loading username (password not stored for security)');
                        setCredentials({
                            emailOrUsername: CredentialSecurity.decrypt(parsed.username) || '',
                            password: '' // Never store/restore password
                        });
                        setRememberMe(true);
                    }
                } else {
                    console.log('❌ No remembered credentials found');
                }
            } catch (error) {
                console.error('❌ Error loading remembered credentials:', error);
                // Clear corrupted data
                localStorage.removeItem('rememberedCredentials');
            }
        };

        loadRememberedCredentials();
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
        const rememberMeChecked = formData.get('rememberMe') === 'on';

        try {
            const response = await api.post<LoginResponse>('/api/auth/login', {
                emailOrUsername,
                password,
                rememberMe: rememberMeChecked
            });

            if (response.data.token) {
                // Handle Remember Me functionality with enhanced security
                if (rememberMeChecked) {
                    console.log('💾 Saving credentials (Remember Me checked) - USERNAME ONLY for security');
                    // Only store encrypted username and session token, never password
                    const credentialsToRemember = {
                        username: CredentialSecurity.encrypt(emailOrUsername), // Encrypt username
                        token: CredentialSecurity.encrypt(response.data.token.substring(0, 20)), // Only partial token
                        timestamp: Date.now(),
                        deviceFingerprint: CredentialSecurity.getDeviceFingerprint(), // Device binding
                        version: '2.0' // Version for future migration
                    };
                    localStorage.setItem('rememberedCredentials', JSON.stringify(credentialsToRemember));
                    console.log('✅ Username saved securely (password never stored)');
                } else {
                    console.log('🗑️ Remember Me not checked, clearing any stored credentials');
                    // Clear remembered credentials if not checking remember me
                    localStorage.removeItem('rememberedCredentials');
                }

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
                const redirectPath = response.data.data.user?.lastNav?.startsWith('/') ? response.data.data.user.lastNav : '/users/profile';
                router.push(redirectPath);
            }
        } catch (error: any) {
            console.error('Login failed:', error);
            const errorMessage = error.response?.data?.message || 'An unexpected error occurred. Please try again.';
            setResponseMessage(errorMessage);
        }
    };

    return (
        <AuthTemplate title="Sign in" description={responseMessage || "Login to your ADMS account."}>
            <form className="space-y-6" onSubmit={handleLogin}>
                <div>
                    <label htmlFor="emailOrUsername" className="block text-sm font-semibold text-gray-700 mb-1">Email or Username</label>
                    <Input
                        id="emailOrUsername"
                        name="emailOrUsername"
                        type="text"
                        required
                        placeholder="Enter your email or username"
                        className='dark:text-dark'
                        value={credentials.emailOrUsername}
                        onChange={(e) => setCredentials(prev => ({ ...prev, emailOrUsername: e.target.value }))}
                    />
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
                            className='dark:text-dark pr-10'
                            value={credentials.password}
                            onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
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
                {/* Remember Me Section - Only show if enabled */}
                {process.env.NEXT_PUBLIC_REMEMBER_ME_ENABLED === 'true' && (
                    <>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <label className="flex items-center text-sm text-gray-700 cursor-pointer gap-2">
                                    <Checkbox
                                        id="rememberMe"
                                        name="rememberMe"
                                        checked={rememberMe}
                                        onCheckedChange={(checked) => {
                                            const isChecked = !!checked;
                                            setRememberMe(isChecked);
                                            if (isChecked && process.env.NEXT_PUBLIC_SECURITY_WARNINGS === 'true') {
                                                setShowSecurityWarning(true);
                                            }
                                        }}
                                    />
                                    Remember Me
                                </label>
                                {credentials.emailOrUsername && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCredentials({ emailOrUsername: '', password: '' });
                                            setRememberMe(false);
                                            localStorage.removeItem('rememberedCredentials');
                                        }}
                                        className="text-gray-400 hover:text-gray-600 text-sm ml-1"
                                        title="Clear remembered credentials"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                            <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:underline">Lost your password?</Link>
                        </div>

                        {/* Security Warning for Remember Me */}
                        {showSecurityWarning && process.env.NEXT_PUBLIC_SECURITY_WARNINGS === 'true' && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md p-3">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                            Security Notice
                                        </h3>
                                        <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                                            <p>
                                                Only your username will be remembered for security. Use this feature only on trusted devices.
                                            </p>
                                        </div>
                                        <div className="mt-3">
                                            <button
                                                type="button"
                                                onClick={() => setShowSecurityWarning(false)}
                                                className="text-sm text-yellow-800 dark:text-yellow-200 underline hover:no-underline"
                                            >
                                                I understand
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Fallback if Remember Me is disabled */}
                {process.env.NEXT_PUBLIC_REMEMBER_ME_ENABLED !== 'true' && (
                    <div className="flex items-center justify-between">
                        <div></div> {/* Empty space for layout consistency */}
                        <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:underline">Lost your password?</Link>
                    </div>
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