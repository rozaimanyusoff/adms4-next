'use client';
import React, { useContext, useEffect } from 'react';
import { AuthContext, AuthProvider } from '@/store/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
    //const router = useRouter();
    //const authContext = useContext(AuthContext);
    //const pathname = usePathname();
    
    /* useEffect(() => {
        if (!authContext?.authData) {
            // Store the intended path in sessionStorage before redirecting
            if (typeof window !== 'undefined') {
                sessionStorage.setItem('redirectAfterLogin', pathname ?? '');
            }
            router.push('/auth/login');
        }
    }, [authContext, router, pathname]); */

    return <div className="min-h-screen text-black dark:text-white-dark">{children} </div>;
};

export default AuthLayout;
