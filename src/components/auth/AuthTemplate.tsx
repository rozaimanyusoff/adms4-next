'use client';

import React, { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import useMaintenanceMode from "@/hooks/useMaintenanceMode";

interface AuthTemplateProps {
    children: React.ReactNode;
    title: string;
    description?: string;
    allowDuringMaintenance?: boolean;
}

interface InfoItem {
    date?: string;
    title: string;
    description?: string;
    link?: {
        href: string;
        label: string;
    };
}

const getDescriptionClass = (description?: string) => {
    if (!description) return "text-white/75";
    const desc = description.toLowerCase();
    if (desc.includes("error") || desc.includes("fail") || desc.includes("invalid")) return "text-red-300";
    if (desc.includes("success")) return "text-emerald-300";
    return "text-white/75";
};

const infoItems: InfoItem[] = [
    {
        date: "21/11/2025",
        title: "Vehicle Maintenance Request",
        description: "Follow the steps to log and track your vehicle maintenance.",
        link: {
            href: "/assets/docs/vehicle-mtn-guide.pdf",
            label: "Panduan pengguna (PDF)",
        },
    },
    {
        date: "21/11/2025",
        title: "Poolcar Request",
        description: "Submit transport requests and monitor approval status.",
        link: {
            href: "/assets/docs/vehicle-mtn-guide2.pdf",
            label: "Panduan pengguna (PDF)",
        },
    },
    {
        date: "21/11/2025",
        title: "Start a workflow",
        description: "Create your first record or request to kick things off.",
    },
];

const InfoTimeline = ({ className, items = infoItems }: { className?: string; items?: InfoItem[] }) => (
    <Card className={cn("mt-4 border-none bg-transparent text-white", className)}>
        <CardHeader>
            <Badge className="w-fit border-orange-200/40 bg-orange-500/20 text-orange-100">Info</Badge>
        </CardHeader>
        <CardContent className="px-2 pb-6">
            <div className="relative space-y-4 before:absolute before:left-6 before:top-4 before:h-[calc(100%-1.5rem)] before:w-px before:bg-white/15">
                {items.map((item, index) => (
                    <div key={item.title + index} className="relative pl-16">
                        <div className="absolute left-2 top-1.5 flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white shadow-lg ring-4 ring-orange-500/25">
                            {index + 1}
                        </div>
                        <div className="space-y-1">
                            {item.date && <p className="text-xs font-semibold uppercase tracking-wide text-orange-200/90">{item.date}</p>}
                            <p className="font-semibold text-white">{item.title}</p>
                            {item.description && <p className="text-sm text-white/80">{item.description}</p>}
                            {item.link && (
                                <Link
                                    href={item.link.href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-2 inline-flex items-center text-sm font-semibold text-orange-200 underline hover:text-orange-100"
                                >
                                    {item.link.label}
                                </Link>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </CardContent>
    </Card>
);

const AuthTemplate = ({ children, title, description, allowDuringMaintenance = false }: AuthTemplateProps) => {
    const { maintenance, isActive } = useMaintenanceMode();
    const logoSrc = process.env.NEXT_PUBLIC_BRAND_LOGO_DARK;
    const [showInfo, setShowInfo] = useState(false);
    const maintenanceMessage = maintenance.message?.trim() || "We're performing planned maintenance.";
    const maintenanceReturn = maintenance.until ? new Date(maintenance.until) : null;
    const formattedReturn = maintenanceReturn && !isNaN(maintenanceReturn.getTime())
        ? maintenanceReturn.toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })
        : null;

    const timelineItems = useMemo(() => {
        if (!isActive) return infoItems;
        return [
            {
                date: maintenance.updatedAt ? new Date(maintenance.updatedAt).toLocaleDateString() : undefined,
                title: "Under maintenance",
                description: maintenanceMessage,
            },
            {
                date: formattedReturn ? "Back by" : undefined,
                title: formattedReturn ? formattedReturn : "We will be back shortly",
                description: maintenance.updatedBy ? `Scheduled by ${maintenance.updatedBy}` : undefined,
            },
        ];
    }, [formattedReturn, isActive, maintenance.updatedAt, maintenance.updatedBy, maintenanceMessage]);

    const maintenanceBlocked = isActive && !allowDuringMaintenance;

    return (
        <div className="relative min-h-screen flex items-stretch">
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                <img src="/assets/images/map-dark.svg" alt="Background" className="object-cover w-full h-full" />
                <div className="absolute inset-0 bg-black/40" />
            </div>
            {/* Left Side: Welcome Section */}
            <div className="relative z-10 hidden flex-col justify-center px-12 py-16 text-white lg:flex lg:w-1/3">
                <div className="flex items-center gap-3">
                    <h1 className="text-5xl font-extrabold mb-4 drop-shadow-lg">{isActive ? "Under Maintenance" : <>Welcome<br />Back</>}</h1>
                    {isActive && <Badge className="h-8 rounded-full bg-orange-500/30 text-orange-100 border border-orange-200/30">Maintenance</Badge>}
                </div>
                <p className="mb-4 text-2xl font-bold tracking-wide text-orange-200">ADMS</p>
                <p className="mb-4 text-lg max-w-md text-white/90">
                    {isActive
                        ? maintenanceMessage + (formattedReturn ? ` Expected back by ${formattedReturn}.` : "")
                        : "Administrative Management System (ADMS) helps organizations manage internal business and administration processes across multiple fields of operations."
                    }
                </p>
                <Separator className="border-gray-500/50" />
                <InfoTimeline items={timelineItems} />
            </div>
            {/* Right Side: Auth Form */}
            <div className="relative z-10 flex flex-1 justify-end max-lg:justify-center">
                <div className={cn(
                    "relative flex flex-col justify-center w-full max-w-full px-8 py-16 min-h-screen overflow-hidden rounded-l-3xl border border-white/20 bg-white/50 text-slate-100 shadow-[0_25px_45px_rgba(0,0,0,0.35)] backdrop-blur-md supports-backdrop-filter:bg-white/10 max-lg:w-full max-lg:rounded-none max-lg:border-l-0 lg:max-w-xl",
                    "transition-all duration-500 ease-in-out",
                    maintenanceBlocked ? "translate-x-6 opacity-0 pointer-events-none select-none" : "translate-x-0 opacity-100"
                )}>
                    <div className="pointer-events-none absolute inset-0 bg-white/20" />
                    <div className="pointer-events-none absolute -top-28 -right-20 h-56 w-56 rounded-full bg-gray-500/40 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-24 -left-20 h-52 w-52 rounded-full bg-gray-700/30 blur-3xl" />
                    <div className="absolute right-4 top-4 z-20 flex items-center gap-2 lg:hidden">
                        {showInfo ? (
                            <>
                                <span className="text-xs font-semibold uppercase tracking-wide text-white/80">Info</span>
                                <Button
                                    type="button"
                                    onClick={() => setShowInfo(false)}
                                    size="sm"
                                    variant="secondary"
                                    className="gap-1 rounded-full border border-white/20 bg-black/40 text-white shadow hover:bg-black/60"
                                >
                                    <ArrowLeft size={14} />
                                    Back
                                </Button>
                            </>
                        ) : (
                            <Button
                                type="button"
                                onClick={() => setShowInfo(true)}
                                size="sm"
                                variant="secondary"
                                className="gap-1 rounded-full border border-white/20 bg-black/40 text-white shadow hover:bg-black/60"
                            >
                                Info
                            </Button>
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
                        <InfoTimeline className="mt-0 w-full" items={timelineItems} />
                        <Button
                            asChild
                            className="w-full bg-orange-500 text-white shadow-lg hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
                        >
                            <Link href="/assets/docs/vehicle-mtn-guide.pdf" target="_blank" rel="noreferrer">
                                Open Guide
                            </Link>
                        </Button>
                    </div>
                </div>
                {isActive && maintenanceBlocked && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center px-6">
                        <div className="w-full max-w-xl rounded-3xl border border-orange-200/30 bg-black/70 p-8 text-white shadow-2xl backdrop-blur-lg">
                            <div className="flex items-center gap-3">
                                <Badge className="bg-orange-500/30 text-orange-100 border border-orange-200/30">Maintenance mode</Badge>
                                {formattedReturn && <span className="text-sm text-orange-100/80">Planned back by {formattedReturn}</span>}
                            </div>
                            <h3 className="mt-4 text-2xl font-bold">We&rsquo;ll be back soon</h3>
                            <p className="mt-2 text-sm text-white/80">{maintenanceMessage}</p>
                            {maintenance.updatedBy && <p className="mt-1 text-xs text-white/60">Scheduled by {maintenance.updatedBy}</p>}
                        </div>
                    </div>
                )}
                {isActive && allowDuringMaintenance && (
                    <div className="absolute left-4 top-4 z-20">
                        <Badge className="bg-orange-500/20 text-orange-100 border border-orange-200/40">Maintenance mode • admin override</Badge>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuthTemplate;
