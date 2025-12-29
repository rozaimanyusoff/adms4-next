import { FolderCog } from "lucide-react";
import { GuideSection } from "../types";

const navigation: GuideSection = {
    key: "navigation",
    title: "Navigation & modules",
    summary: "Control menu visibility and module access.",
    icon: FolderCog,
    checklist: [
        {
            heading: "Navigation tree",
            items: [
                "Use the Navigation tab to add, reorder, or disable menu entries.",
                "Attach navigation nodes to groups to hide items from users who do not need them.",
            ],
        },
        {
            heading: "Modules and workflows",
            items: [
                "Module tab controls feature toggles; keep staging-only modules turned off in production.",
                "Workflow tab lets you review hand-offs and approvals; ensure groups/roles align with each step.",
            ],
        },
    ],
    tips: [
        "After changing navigation, ask one target user to confirm the menu looks correct on their account.",
        "Use descriptive labels instead of abbreviations to reduce support tickets.",
    ],
};

export default navigation;
