import { RefreshCw } from "lucide-react";
import { GuideSection } from "../types";

const maintenance: GuideSection = {
    key: "maintenance",
    title: "Maintenance & recovery",
    summary: "Suspensions, resets, and audit trails.",
    icon: RefreshCw,
    checklist: [
        {
            heading: "Account hygiene",
            items: [
                "Suspend accounts that are inactive or risky; reactivate only after confirming with a manager.",
                "Reset passwords via the Action Sidebar to send fresh credentials to the user’s email.",
            ],
        },
        {
            heading: "Audits and cleanup",
            items: [
                "Review Logs tab for role/group changes and navigation edits after deployments.",
                "Periodically clear stale pending registrations and expired invitations.",
            ],
        },
    ],
    tips: [
        "Keep a weekly slot for access reviews to catch drifting permissions early.",
        "Always refresh the grid after bulk actions to ensure counters and selections stay in sync.",
    ],
};

export default maintenance;
