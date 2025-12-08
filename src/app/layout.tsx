'use client';
import ProviderComponent from '@/components/layouts/provider-component';
import 'react-perfect-scrollbar/dist/css/styles.css';
import '../styles/tailwind.css';
import { Toaster } from "@/components/ui/sonner";
import { useSelector } from 'react-redux';
import { useEffect } from 'react';
import { getColorHex } from '@/lib/colorUtils';
import { IRootState } from '@/store';

function ColorThemeEffectClient() {
    // This must be a client component for useSelector to work
    'use client';
    const primaryColor = useSelector((state: IRootState) => state.themeConfig.primaryColor);
    useEffect(() => {
        document.documentElement.style.setProperty('--color-primary', getColorHex(primaryColor));
    }, [primaryColor]);
    return null;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                {/* Prevent flash: set dark class before hydration */}
                <script
                  dangerouslySetInnerHTML={{
                    __html: `
                    (function() {
                      try {
                        var ls = localStorage.getItem('theme');
                        var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                        var dark = ls === 'dark' || (ls === 'system' && prefersDark);
                        var html = document.documentElement; var body = document.body;
                        if (dark) { html.classList.add('dark'); body.classList.add('dark'); }
                        else { html.classList.remove('dark'); body.classList.remove('dark'); }
                      } catch (e) {}
                    })();
                  `}}
                />
                <Toaster richColors position="top-right" />
                <ProviderComponent>
                  <ColorThemeEffectClient />
                  {children}
                </ProviderComponent>
            </body>
        </html>
    );
}
