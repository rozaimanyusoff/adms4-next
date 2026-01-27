'use client';
import React, { useContext, useEffect } from 'react';
import { AuthContext, AuthProvider } from '@/store/AuthContext';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
    const router = useRouter();
    const authContext = useContext(AuthContext);
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        // Define paths that don't require authentication
        const publicPaths = [
            '/auth/login',
            '/auth/register',
            '/auth/forgot-password',
            '/auth/reset-password',
            '/auth/activate',
            '/pages/error404',
            '/pages/error500',
            '/pages/error503',
            '/pages/maintenence',
            '/admin/mgmt',
            // Public, tokenized portals accessible from email links
            '/mtn/vehicle/portal',
            '/assets/transfer/portal'
        ];

        // Check if current path is public
        const isPublicPath = publicPaths.some(path => pathname?.startsWith(path));

        // If not authenticated and trying to access protected blank pages
        if (!authContext?.authData && !isPublicPath) {
            // Store the intended path in sessionStorage before redirecting
            if (typeof window !== 'undefined') {
                const target = `${pathname ?? ''}${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`;
                sessionStorage.setItem('redirectAfterLogin', target);
                try { localStorage.setItem('postLoginRedirect', target); } catch { /* ignore */ }
            }
            const targetEncoded = encodeURIComponent(`${pathname ?? ''}${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`);
            router.push(`/auth/login?redirect=${targetEncoded}`);
        }

        // If authenticated and trying to access auth pages, redirect to dashboard
        if (authContext?.authData && pathname?.startsWith('/auth/')) {
            const lastNav = authContext.authData.user?.lastNav;
            // Fallback changed from '/dashboard' to '/users/profile' to ensure first-time activation/login lands on profile
            router.push(lastNav && lastNav !== '/' ? lastNav : '/users/profile');
        }
    }, [authContext, router, pathname]);

    return <div className="min-h-screen text-black dark:text-white-dark">{children} </div>;
};

export default AuthLayout;
