import { LucideIcon } from "lucide-react";

export type GuideChecklistBlock = {
    heading: string;
    items: string[];
};

export type GuideSection = {
    key: string;
    title: string;
    summary: string;
    icon: LucideIcon;
    checklist: GuideChecklistBlock[];
    tips?: string[];
    image?: { src: string; alt: string };
};
