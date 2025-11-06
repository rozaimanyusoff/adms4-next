import React from "react";
import { Facebook, Twitter, Instagram, Youtube } from "lucide-react";
import Link from "next/link";

interface AuthTemplateProps {
    children: React.ReactNode;
    title: string;
    description?: string;
}

const getDescriptionClass = (description?: string) => {
    if (!description) return "text-white/75";
    const desc = description.toLowerCase();
    if (desc.includes("error") || desc.includes("fail") || desc.includes("invalid")) return "text-red-300";
    if (desc.includes("success")) return "text-emerald-300";
    return "text-white/75";
};

const AuthTemplate = ({ children, title, description }: AuthTemplateProps) => {
    const logoSrc = process.env.NEXT_PUBLIC_BRAND_LOGO_DARK;
    return (
        <div className="relative min-h-screen flex items-stretch">
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                <img src="/assets/images/map-dark.svg" alt="Background" className="object-cover w-full h-full" />
                <div className="absolute inset-0 bg-black/40" />
            </div>
            {/* Left Side: Welcome Section */}
            <div className="relative z-10 flex flex-col justify-center w-1/2 px-12 py-16 text-white max-lg:hidden">
                <h1 className="text-5xl font-extrabold mb-4 drop-shadow-lg">Welcome<br />Back</h1>
                <p className="mb-4 text-2xl font-bold tracking-wide text-orange-200">ADMS</p>
                <p className="mb-8 text-lg max-w-md text-white/90">
                    Administrative Management System (ADMS) helps organizations manage internal business and administration processes across multiple fields of operations.
                </p>
                <div className="flex gap-4 mt-4">
                    <a href="#" aria-label="Facebook" className="hover:text-blue-400"><Facebook size={28} /></a>
                    <a href="#" aria-label="Twitter" className="hover:text-blue-400"><Twitter size={28} /></a>
                    <a href="#" aria-label="Instagram" className="hover:text-pink-400"><Instagram size={28} /></a>
                    <a href="#" aria-label="YouTube" className="hover:text-red-400"><Youtube size={28} /></a>
                </div>
            </div>
            {/* Right Side: Auth Form */}
            <div className="relative z-10 flex flex-1 justify-end max-lg:justify-center">
                <div className="relative flex flex-col justify-center w-full max-w-xl px-8 py-16 min-h-screen overflow-hidden rounded-l-3xl border border-white/20 bg-white/50 text-slate-100 shadow-[0_25px_45px_rgba(0,0,0,0.35)] backdrop-blur-md supports-[backdrop-filter]:bg-white/10 max-lg:w-full max-lg:rounded-none max-lg:border-l-0">
                    <div className="pointer-events-none absolute inset-0 bg-white/20" />
                    <div className="pointer-events-none absolute -top-28 -right-20 h-56 w-56 rounded-full bg-gray-500/40 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-24 -left-20 h-52 w-52 rounded-full bg-gray-700/30 blur-3xl" />
                    {logoSrc ? (
                        <div className="absolute top-8 right-10 flex justify-end max-lg:left-1/2 max-lg:-translate-x-1/2 max-lg:top-6 max-lg:right-auto">
                            <img src={logoSrc} alt="Brand logo" className="h-16 w-auto drop-shadow-lg max-lg:h-12" />
                        </div>
                    ) : null}
                    <div className="relative z-10 flex flex-col">
                        <h2 className="text-3xl font-bold mb-6 text-white text-center drop-shadow-md">{title}</h2>
                        {description && <p className={"mb-6 text-center text-sm " + getDescriptionClass(description)}>{description}</p>}
                        {children}
                        <div className="mt-8 text-xs text-center text-white/70">
                            By using ADMS you agree to <Link href="#" className="underline">Terms of Service</Link> | <Link href="#" className="underline">Privacy Policy</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthTemplate;
