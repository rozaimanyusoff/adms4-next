'use client';

import { Metadata } from 'next';
import Link from 'next/link';
import React, { useState, useContext, useEffect, useCallback } from 'react';
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
                view?: boolean;
                create?: boolean;
                update?: boolean;
                delete?: boolean;
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

type AccountResponse = {
    data?: {
        user?: Partial<LoginResponse['data']['user']>;
        [key: string]: unknown;
    } | Partial<LoginResponse['data']['user']>;
    user?: Partial<LoginResponse['data']['user']>;
    [key: string]: unknown;
};

const ComponentLogin = () => {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [responseMessage, setResponseMessage] = useState<string | null>(null);
    const [rememberMe, setRememberMe] = useState(false);
    const [credentials, setCredentials] = useState({ emailOrUsername: '', password: '' });
    const [showSecurityWarning, setShowSecurityWarning] = useState(false);
    const authContext = useContext(AuthContext);
    const RATE_LIMIT_ROUTE = '/api/auth/login';
    const [rateLimit, setRateLimit] = useState<{ blocked: boolean; blockedUntilMs: number | null }>({ blocked: false, blockedUntilMs: null });
    const [countdownMs, setCountdownMs] = useState(0);
    const [attempts, setAttempts] = useState<{ remaining: number; limit: number; current?: number; resetAt?: number } | null>(null);

    const parseBlockedUntilMs = useCallback((payload: any, retryAfterHeader?: string | null): number | null => {
        const now = Date.now();
        if (payload?.blockedUntil != null) {
            if (typeof payload.blockedUntil === 'number') {
                const numeric = payload.blockedUntil;
                return numeric > 1e12 ? numeric : numeric * 1000;
            }
            const parsed = Date.parse(payload.blockedUntil);
            if (!Number.isNaN(parsed)) return parsed;
        }
        if (typeof payload?.remainingMs === 'number') {
            return now + Math.max(0, payload.remainingMs);
        }
        if (payload?.retryAfter != null) {
            const retryVal = payload.retryAfter;
            if (typeof retryVal === 'number') {
                return now + (retryVal > 10_000 ? retryVal : retryVal * 1000);
            }
            const retryNum = Number(retryVal);
            if (!Number.isNaN(retryNum)) {
                return now + (retryNum > 10_000 ? retryNum : retryNum * 1000);
            }
        }
        if (retryAfterHeader) {
            const numeric = Number(retryAfterHeader);
            if (!Number.isNaN(numeric)) {
                return now + numeric * 1000;
            }
            const parsedHeaderDate = Date.parse(retryAfterHeader);
            if (!Number.isNaN(parsedHeaderDate)) {
                return parsedHeaderDate;
            }
        }
        return null;
    }, []);

    const fetchRateLimitStatus = useCallback(async () => {
        try {
            const res = await api.get('/api/auth/rate-limit-status', { params: { route: RATE_LIMIT_ROUTE } });
            type RateLimitStatus = {
                blocked?: boolean;
                remainingMs?: number;
                blockedUntil?: number | string | null;
                retryAfter?: number | string;
                attempts?: { current?: number; remaining?: number; limit?: number; resetAt?: number };
            };
            const data = ((res.data as any)?.data ?? res.data ?? {}) as RateLimitStatus;
            const inferredBlocked = Boolean(data?.blocked);
            const fromRemaining = typeof data?.remainingMs === 'number' && data.remainingMs > 0;
            const blockedUntilMs = (inferredBlocked || fromRemaining)
                ? parseBlockedUntilMs(data, null) ?? (typeof data?.remainingMs === 'number' ? Date.now() + data.remainingMs : null)
                : parseBlockedUntilMs(data, null);
            const blocked = Boolean(blockedUntilMs && blockedUntilMs > Date.now());
            setRateLimit({ blocked, blockedUntilMs: blocked ? blockedUntilMs : null });
            if (data?.attempts) {
                const rem = typeof data.attempts.remaining === 'number' ? data.attempts.remaining : NaN;
                const lim = typeof data.attempts.limit === 'number' ? data.attempts.limit : NaN;
                if (!Number.isNaN(rem) && !Number.isNaN(lim)) {
                    setAttempts({ remaining: rem, limit: lim, current: data.attempts.current, resetAt: data.attempts.resetAt });
                }
            }
            if (blockedUntilMs) {
                setCountdownMs(Math.max(0, blockedUntilMs - Date.now()));
            } else if (!blocked) {
                setCountdownMs(0);
            }
            return data;
        } catch (error) {
            console.error('Failed to fetch rate limit status', error);
            return null;
        }
    }, [RATE_LIMIT_ROUTE, parseBlockedUntilMs]);

    useEffect(() => {
        fetchRateLimitStatus();
    }, [fetchRateLimitStatus]);

    useEffect(() => {
        if (!rateLimit.blocked) {
            setCountdownMs(0);
            return;
        }
        const updateCountdown = () => {
            if (!rateLimit.blockedUntilMs) {
                setCountdownMs(0);
                return;
            }
            const remaining = Math.max(0, rateLimit.blockedUntilMs - Date.now());
            setCountdownMs(remaining);
            if (remaining <= 0) {
                fetchRateLimitStatus();
            }
        };
        updateCountdown();
        const intervalId = setInterval(updateCountdown, 1000);
        return () => clearInterval(intervalId);
    }, [rateLimit.blocked, rateLimit.blockedUntilMs, fetchRateLimitStatus]);

    useEffect(() => {
        if (!rateLimit.blocked) return;
        const pollId = setInterval(() => {
            fetchRateLimitStatus();
        }, 8000);
        return () => clearInterval(pollId);
    }, [rateLimit.blocked, fetchRateLimitStatus]);

    useEffect(() => {
        if (!rateLimit.blocked && responseMessage && responseMessage.includes('Too many login attempts')) {
            setResponseMessage(null);
        }
    }, [rateLimit.blocked, responseMessage]);

    const formatCountdown = (ms: number) => {
        if (ms <= 0) return '0s';
        const totalSeconds = Math.ceil(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        if (minutes > 0) {
            return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
        }
        return `${seconds}s`;
    };

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
            return 'text-rose-200';
        } else if (message?.toLowerCase().includes('success')) {
            return 'text-emerald-200';
        } else {
            return 'text-white';
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

                // Fetch latest account info (including role) with the freshly issued token
                let mergedUser = response.data.data.user;
                try {
                    const accountRes = await api.get<AccountResponse>('/api/auth/account', {
                        headers: { Authorization: `Bearer ${response.data.token}` }
                    });
                    const accountData = accountRes.data;
                    const nestedUser = typeof accountData.data === 'object' && accountData.data !== null && 'user' in accountData.data
                        ? (accountData.data as { user?: Partial<LoginResponse['data']['user']> }).user
                        : undefined;
                    const accountUser = nestedUser ?? accountData.user ?? accountData.data ?? null;
                    if (accountUser) {
                        mergedUser = { ...mergedUser, ...accountUser };
                    }
                } catch (err) {
                    console.warn('Could not refresh account info after login', err);
                }

                if (authContext && authContext.setAuthData) {
                    authContext.setAuthData({
                        token: response.data.token,
                        user: mergedUser,
                        usergroups: response.data.data.usergroups,
                        navTree: response.data.data.navTree,
                    });
                } else {
                    console.error('AuthContext is not properly initialized.');
                }

                // Safely access lastNav or fallback to /analytics
                const redirectPath = response.data.data.user?.lastNav?.startsWith('/') ? response.data.data.user.lastNav : '/users/profile';
                router.push(redirectPath);
                setRateLimit({ blocked: false, blockedUntilMs: null });
                setCountdownMs(0);
                setAttempts(null);
            }
        } catch (error: any) {
            if (error.response?.status === 429) {
                const retryAfterHeader = error.response.headers?.['retry-after'] ?? error.response.headers?.['Retry-After'];
                const blockedUntilMs = parseBlockedUntilMs(error.response?.data, retryAfterHeader);
                const fallbackUntil = Date.now() + 30_000;
                const effectiveUntil = blockedUntilMs ?? fallbackUntil;
                setRateLimit({
                    blocked: true,
                    blockedUntilMs: effectiveUntil,
                });
                const remaining = Math.max(0, effectiveUntil - Date.now());
                setCountdownMs(remaining);
                // Also refresh attempts left
                const status = await fetchRateLimitStatus();
                const a = (status as any)?.attempts;
                if (a && typeof a.remaining === 'number' && typeof a.limit === 'number') {
                    setResponseMessage(`Too many attempts. Try again later. Attempts left: ${a.remaining}/${a.limit}`);
                } else {
                    const apiMessage = error.response?.data?.message;
                    setResponseMessage(apiMessage || 'Too many login attempts. Please wait before trying again.');
                }
            } else {
                console.error('Login failed:', error);
                // After wrong credentials, fetch rate-limit status and show remaining attempts instead
                const status = await fetchRateLimitStatus();
                const a = (status as any)?.attempts;
                if (a && typeof a.remaining === 'number' && typeof a.limit === 'number') {
                    setResponseMessage(`Invalid username or password. Attempts left: ${a.remaining}/${a.limit}`);
                } else {
                    const errorMessage = error.response?.data?.message || 'Invalid username or password.';
                    setResponseMessage(errorMessage);
                }
            }
        }
    };

    return (
        <AuthTemplate title="Sign in" description={responseMessage || "Login to your ADMS account."}>
            <form className="space-y-6" onSubmit={handleLogin}>
                <div>
                    <label htmlFor="emailOrUsername" className="block text-sm font-semibold text-white/90 mb-1">Email or Username</label>
                    <Input
                        variant="translucent"
                        id="emailOrUsername"
                        name="emailOrUsername"
                        type="text"
                        required
                        placeholder="Enter your email or username"
                        value={credentials.emailOrUsername}
                        onChange={(e) => setCredentials(prev => ({ ...prev, emailOrUsername: e.target.value }))}
                    />
                </div>
                <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-white/90 mb-1">Password</label>
                    <div className="relative">
                        <Input
                            variant="translucent"
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            required
                            placeholder="Enter your password"
                            className='pr-10'
                            value={credentials.password}
                            onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-5 text-white/70 hover:text-white"
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
                                <label className="flex items-center text-sm text-white/80 cursor-pointer gap-2">
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
                                        className="text-white/60 hover:text-white/85 text-sm ml-1"
                                        title="Clear remembered credentials"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                            <Link href="/auth/forgot-password" className="text-sm text-blue-300 hover:text-blue-200 underline-offset-2 hover:underline">Lost your password?</Link>
                        </div>

                        {/* Security Warning for Remember Me */}
                        {showSecurityWarning && process.env.NEXT_PUBLIC_SECURITY_WARNINGS === 'true' && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md p-3">
                                <div className="flex">
                                    <div className="shrink-0">
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
                        <Link href="/auth/forgot-password" className="text-sm text-blue-300 hover:text-blue-200 underline-offset-4 hover:underline">Lost your password?</Link>
                    </div>
                )}
                {rateLimit.blocked && (
                    <p className="text-xs text-amber-200 text-center font-medium">
                        Too many attempts. Try again in {formatCountdown(Math.max(countdownMs, 0))}.
                    </p>
                )}
                <Button
                    type="submit"
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={rateLimit.blocked}
                >
                    Sign in now
                </Button>
                <div className="text-center mt-4">
                    <span className="text-sm text-white/80">Not a member? </span>
                    <Link href="/auth/register" className="text-sm text-blue-300 hover:text-blue-200 underline-offset-4 hover:underline font-semibold">Sign up</Link>
                </div>
            </form>
        </AuthTemplate>
    );
};

export default ComponentLogin;
