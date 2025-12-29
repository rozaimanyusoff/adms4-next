'use client';

import React, { useMemo, useState } from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { adminGuideSections } from "./content";
import { GuideSection } from "./types";

const AdminGuide: React.FC = () => {
    const [activeKey, setActiveKey] = useState<string>(adminGuideSections[0]?.key ?? "");

    const activeSection: GuideSection | undefined = useMemo(
        () => adminGuideSections.find((section) => section.key === activeKey) || adminGuideSections[0],
        [activeKey]
    );

    if (!activeSection) {
        return null;
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-gray-100">Admin Guide</h2>
                <p className="text-sm text-slate-600 dark:text-gray-300">
                    A quick reference for managing user accounts, approvals, and access controls.
                </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-4 space-y-3">
                    {adminGuideSections.map((section) => {
                        const Icon = section.icon;
                        const isActive = section.key === activeKey;
                        return (
                            <button
                                key={section.key}
                                type="button"
                                onClick={() => setActiveKey(section.key)}
                                className={`panel w-full text-left p-4 rounded-lg border transition ${
                                    isActive
                                        ? "border-blue-500 shadow-md bg-blue-50/70 dark:bg-slate-800"
                                        : "border-slate-200 hover:border-blue-300 dark:border-slate-700"
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <span
                                        className={`rounded-md p-2 ${
                                            isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"
                                        }`}
                                    >
                                        <Icon className="h-5 w-5" />
                                    </span>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <div className="font-semibold text-sm text-slate-800 dark:text-gray-100">
                                                {section.title}
                                            </div>
                                            {isActive && (
                                                <CheckCircle2 className="h-4 w-4 text-blue-600" aria-hidden="true" />
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-600 dark:text-gray-400 mt-1">
                                            {section.summary}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
                <div className="lg:col-span-8">
                    <div className="panel h-full rounded-lg border border-slate-200 dark:border-slate-700 p-5 space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="rounded-md bg-blue-100 text-blue-700 p-2">
                                <activeSection.icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                                <div className="text-lg font-semibold text-slate-800 dark:text-gray-100">
                                    {activeSection.title}
                                </div>
                                <div className="text-sm text-slate-600 dark:text-gray-300">{activeSection.summary}</div>
                            </div>
                        </div>
                        {activeSection.image && (
                            <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                                <img
                                    src={activeSection.image.src}
                                    alt={activeSection.image.alt}
                                    className="w-full h-auto"
                                />
                            </div>
                        )}
                        <div className="space-y-4">
                            {activeSection.checklist.map((block) => (
                                <div key={block.heading} className="space-y-2">
                                    <div className="font-semibold text-slate-800 dark:text-gray-100">{block.heading}</div>
                                    <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700 dark:text-gray-300">
                                        {block.items.map((item) => (
                                            <li key={item}>{item}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                        {activeSection.tips && activeSection.tips.length > 0 && (
                            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 space-y-2">
                                <div className="font-semibold text-amber-800 flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4" />
                                    Quick tips
                                </div>
                                <ul className="list-disc pl-5 space-y-1 text-sm text-amber-900">
                                    {activeSection.tips.map((tip) => (
                                        <li key={tip}>{tip}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminGuide;
