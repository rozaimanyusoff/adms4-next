import React from "react";
import { Eye, EyeOff, Facebook, Twitter, Instagram, Youtube } from "lucide-react";
import Link from "next/link";

interface AuthTemplateProps {
    children: React.ReactNode;
    title: string;
    description?: string;
}

const getDescriptionClass = (description?: string) => {
    if (!description) return "text-gray-600";
    const desc = description.toLowerCase();
    if (desc.includes("error") || desc.includes("fail") || desc.includes("invalid")) return "text-danger";
    if (desc.includes("success")) return "text-success";
    return "text-gray-600";
};

const AuthTemplate = ({ children, title, description }: AuthTemplateProps) => {
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
            <div className="relative z-10 flex flex-col justify-center w-full max-w-lg ml-auto px-8 py-16 bg-slate-200/80 rounded-l-3xl shadow-2xl min-h-screen max-lg:w-full max-lg:rounded-none">
                <h2 className="text-3xl font-bold mb-8 text-gray-800 text-center">{title}</h2>
                {description && <p className={"mb-6 text-center " + getDescriptionClass(description)}>{description}</p>}
                {children}
                <div className="mt-8 text-xs text-center text-gray-600">
                    By using ADMS you agree to <Link href="#" className="underline">Terms of Service</Link> | <Link href="#" className="underline">Privacy Policy</Link>
                </div>
            </div>
        </div>
    );
};

export default AuthTemplate;
