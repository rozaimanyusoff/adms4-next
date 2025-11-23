import React, { useState } from "react";
import { Facebook, Twitter, Instagram, Youtube, ArrowLeft } from "lucide-react";
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
    const [showInfo, setShowInfo] = useState(false);
    return (
        <div className="relative min-h-screen flex items-stretch">
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                <img src="/assets/images/map-dark.svg" alt="Background" className="object-cover w-full h-full" />
                <div className="absolute inset-0 bg-black/40" />
            </div>
            {/* Left Side: Welcome Section */}
            <div className="relative z-10 hidden flex-col justify-center px-12 py-16 text-white lg:flex lg:w-1/2">
                <h1 className="text-5xl font-extrabold mb-4 drop-shadow-lg">Welcome<br />Back</h1>
                <p className="mb-4 text-2xl font-bold tracking-wide text-orange-200">ADMS</p>
                <p className="mb-8 text-lg max-w-md text-white/90">
                    Administrative Management System (ADMS) helps organizations manage internal business and administration processes across multiple fields of operations.
                </p>
                <div className="mt-6 w-96 rounded-2xl border-none border-white/15 py-5 shadow-2xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-200/90 mb-3">Info</p>
                    <ol className="space-y-3 text-sm text-white/85">
                        <li className="flex items-start gap-3">
                            <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white">1</span>
                            <div>
                                <span className="font-semibold text-white">Vehicle Maintenance Request</span><br />
                                <Link href="/assets/docs/vehicle-mtn-guide.pdf" target="_blank" rel="noreferrer" className="text-orange-200 hover:text-orange-100 underline">
                                    Panduan pengguna (PDF)
                                </Link>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white">2</span>
                            <div><span className="font-semibold text-white">Poolcar Request</span><br /><Link href="/assets/docs/vehicle-mtn-guide.pdf" target="_blank" rel="noreferrer" className="text-orange-200 hover:text-orange-100 underline">
                                Panduan pengguna (PDF)
                            </Link>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white">3</span>
                            <div><span className="font-semibold text-white">Start a workflow</span><br />Create your first record or request.</div>
                        </li>
                    </ol>
                </div>
            </div>
            {/* Right Side: Auth Form */}
            <div className="relative z-10 flex flex-1 justify-end max-lg:justify-center">
                <div className="relative flex flex-col justify-center w-full max-w-full px-8 py-16 min-h-screen overflow-hidden rounded-l-3xl border border-white/20 bg-white/50 text-slate-100 shadow-[0_25px_45px_rgba(0,0,0,0.35)] backdrop-blur-md supports-[backdrop-filter]:bg-white/10 max-lg:w-full max-lg:rounded-none max-lg:border-l-0 lg:max-w-xl">
                    <div className="pointer-events-none absolute inset-0 bg-white/20" />
                    <div className="pointer-events-none absolute -top-28 -right-20 h-56 w-56 rounded-full bg-gray-500/40 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-24 -left-20 h-52 w-52 rounded-full bg-gray-700/30 blur-3xl" />
                    <div className="absolute right-4 top-4 z-20 flex items-center gap-2 lg:hidden">
                        {showInfo ? (
                            <>
                                <span className="text-xs font-semibold uppercase tracking-wide text-white/80">Info</span>
                                <button
                                    type="button"
                                    onClick={() => setShowInfo(false)}
                                    className="inline-flex items-center gap-1 rounded-full bg-black/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow"
                                >
                                    <ArrowLeft size={14} />
                                    Back
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowInfo(true)}
                                className="inline-flex items-center gap-1 rounded-full bg-black/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow"
                            >
                                Info
                            </button>
                        )}
                    </div>
                    {logoSrc ? (
                        <div className="absolute top-8 right-10 flex justify-end max-lg:left-1/2 max-lg:-translate-x-1/2 max-lg:top-6 max-lg:right-auto">
                            <img src={logoSrc} alt="Brand logo" className="h-16 w-auto drop-shadow-lg max-lg:h-12" />
                        </div>
                    ) : null}
                    <div className={showInfo ? "relative z-10 hidden flex-col lg:flex" : "relative z-10 flex flex-col"}>
                        <h2 className="text-3xl font-bold mb-6 text-white text-center drop-shadow-md">{title}</h2>
                        {description && <p className={"mb-6 text-center text-sm " + getDescriptionClass(description)}>{description}</p>}
                        {children}
                        <div className="mt-8 text-xs text-center text-white/70">
                            By using ADMS you agree to <Link href="#" className="underline">Terms of Service</Link> | <Link href="#" className="underline">Privacy Policy</Link>
                        </div>
                    </div>
                    <div className={showInfo ? "relative z-10 mt-8 flex flex-col gap-4 text-white lg:hidden" : "hidden"}>
                        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-200/90">Info</p>
                        <ol className="space-y-3 text-sm text-white/85">
                            <li className="flex items-start gap-3">
                                <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white">1</span>
                                <div>
                                    <span className="font-semibold text-white">Vehicle Maintenance Request</span><br />
                                    <Link href="/assets/docs/vehicle-mtn-guide.pdf" target="_blank" rel="noreferrer" className="text-orange-200 underline hover:text-orange-100">
                                        Panduan pengguna (PDF)
                                    </Link>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white">2</span>
                                <div><span className="font-semibold text-white">Set up your team</span><br />Invite members and assign roles.</div>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white">3</span>
                                <div><span className="font-semibold text-white">Start a workflow</span><br />Create your first record or request.</div>
                            </li>
                        </ol>
                        <Link
                            href="/assets/docs/vehicle-mtn-guide.pdf"
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center justify-center rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
                        >
                            Open Guide
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthTemplate;
