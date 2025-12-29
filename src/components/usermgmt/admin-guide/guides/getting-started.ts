import { BookOpenCheck } from "lucide-react";
import { GuideSection } from "../types";

const gettingStarted: GuideSection = {
    key: "getting-started",
    title: "Getting started",
    summary: "Dashboard overview, status cards, and filters.",
    icon: BookOpenCheck,
    checklist: [
        {
            heading: "Quick orientation",
            items: [
                "Use the summary cards to jump between Active, Inactive, Pending Activation, and Suspended users.",
                "Toggle “Show pending approval” to switch the grid into pending review mode.",
                "Use column filters (text inputs) to quickly narrow down records by name, email, or contact.",
            ],
        },
        {
            heading: "Data refresh",
            items: [
                "The counts on the summary cards reflect the latest fetch; click a card to re-query and focus the view.",
                "Use the in-grid search to filter across all visible columns when you need a quick keyword match.",
            ],
        },
    ],
    tips: [
        "The summary filter is sticky — your last selected card reopens on refresh.",
        "Hover over status pills for a quick sense of Active vs Pending vs Suspended users.",
    ],
};

export default gettingStarted;
