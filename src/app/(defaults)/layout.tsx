'use client';
import ContentAnimation from '@/components/layouts/content-animation';
import Footer from '@/components/layouts/footer';
import Header from '@/components/layouts/header';
import MainContainer from '@/components/layouts/main-container';
import Overlay from '@/components/layouts/overlay';
import ScrollToTop from '@/components/layouts/scroll-to-top';
import Setting from '@/components/layouts/setting';
import CustomSidebar from '@components/layouts/SettingSidebar';
import Sidebar from '@/components/layouts/sidebar';
import Portals from '@/components/portals';
import { AuthContext, AuthProvider } from '@/store/AuthContext';
import { authenticatedApi } from '@/config/api';
import { DetectUserInactivity } from '@/config/detectUserInactivity';
import { toast, Toaster } from "sonner";
import { useContext, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { scheduleTokenRefresh } from '@/config/scheduleTokenRefresh';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layouts/app-sidebar"

export default function DefaultLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const authContext = useContext(AuthContext);

    // Fallback: use NEXT_PUBLIC_IDLE_TIMEOUT if NEXT_PUBLIC_TIMEOUT_ENABLED is not set
    const timeoutEnabled = (process.env.NEXT_PUBLIC_TIMEOUT_ENABLED ?? process.env.NEXT_PUBLIC_IDLE_TIMEOUT) === 'true';

    useEffect(() => {
        function handleShowToast(e: CustomEvent) {
            toast(e.detail.title, {
                description: e.detail.description,
                // Optionally map color/type if needed
            });
        }
        window.addEventListener('show-toast', handleShowToast as EventListener);
        return () => {
            window.removeEventListener('show-toast', handleShowToast as EventListener);
        };
    }, []);

    useEffect(() => {
        if (!authContext?.authData) {
            router.push('/auth/login');
        } else {
            // Track the last visited route with userId
            const userId = authContext.authData.user?.id;
            authenticatedApi.put('/api/nav/track-route', { path: pathname, userId })
                .then(() => {
                    //console.log('Last route tracked successfully');
                })
                .catch((error) => {
                    console.error('Error tracking last route:', error);
                });
        }
    }, [authContext, router, pathname]);

    // Handler for logout
    const handleLogout = async () => {
        try {
            await authenticatedApi.post('/api/auth/logout');
        } catch (e) {
            // Optionally handle error, but proceed with local logout
        }
        authContext?.logout?.();
        router.push('/auth/login');
    };

    useEffect(() => {
        if (!authContext?.authData) return;
        // Setup token refresh
        const cleanup = scheduleTokenRefresh({
            getToken: () => authContext.authData?.token || null,
            authContext,
            refreshBeforeMs: parseInt(process.env.NEXT_PUBLIC_TOKEN_REMAINING_TIME || '60000', 10),
            handleLogout,
        });
        return cleanup;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authContext?.authData?.token]);

    if (!authContext?.authData) {
        return null; // Optionally, show a loading spinner here
    }

    return (
        <>
            <DetectUserInactivity
                idleTime={parseInt(process.env.NEXT_PUBLIC_MAX_IDLE_TIMEOUT || '120000', 10)}
                countdownSeconds={parseInt(process.env.NEXT_PUBLIC_COUNTDOWN_TIMER || '60', 10)}
                onLogout={handleLogout}
            >
                {() => null}
            </DetectUserInactivity>
            {/* Example AlertDialog usage (replace or remove as needed) */}
            {/*
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <button>Open Modal</button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            */}
            {/* BEGIN MAIN CONTAINER */}
            <div className="relative">
                <Overlay />
                <ScrollToTop />
                {/* BEGIN APP SETTING LAUNCHER */}
                {/* <Setting /> */}
                {/* END APP SETTING LAUNCHER */}
                <MainContainer>
                    {/* BEGIN SIDEBAR */}
                    <Sidebar />
                    {/* <SidebarProvider> */}
                        {/* <AppSidebar /> */}
                        {/* <SidebarTrigger /> */}
                    {/* END SIDEBAR */}
                    <div className="main-content flex min-h-screen flex-col">
                        
                        {/* BEGIN TOP NAVBAR */}
                        <Header />
                        {/* END TOP NAVBAR */}
                        {/* BEGIN CONTENT AREA */}
                        
                        <ContentAnimation>{children}</ContentAnimation>
                        {/* END CONTENT AREA */}
                        {/* BEGIN FOOTER */}
                        <Footer />
                        {/* END FOOTER */}
                        <Portals />
                    </div>
                    {/* </SidebarProvider> */}
                </MainContainer>
            </div>
        </>
    );
}
