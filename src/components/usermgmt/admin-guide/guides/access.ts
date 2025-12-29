import { ShieldCheck } from "lucide-react";
import { GuideSection } from "../types";

const access: GuideSection = {
    key: "access",
    title: "Access controls",
    summary: "Roles, groups, and permission hygiene.",
    icon: ShieldCheck,
    checklist: [
        {
            heading: "Roles",
            items: [
                "Use the Roles tab to maintain scoped permission sets; avoid editing the Super Admin role.",
                "Bulk-change roles from the Action Sidebar when multiple users need the same access level.",
            ],
        },
        {
            heading: "Groups",
            items: [
                "Groups are for functional or departmental visibility; assign only what the user needs.",
                "When moving teams, remove old groups before adding new ones to reduce stale access.",
            ],
        },
        {
            heading: "Permissions",
            items: [
                "Use the Permissions tab to map features to roles; keep a minimal baseline role for general users.",
                "Audit permission changes after major releases to ensure new modules remain covered.",
            ],
        },
    ],
    tips: [
        "System accounts (role id 1) are protected from bulk selection to prevent accidental edits.",
        "Document every custom role: include a short description for future admins.",
    ],
};

export default access;
