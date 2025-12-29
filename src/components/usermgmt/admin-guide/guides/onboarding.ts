import { Users } from "lucide-react";
import { GuideSection } from "../types";

const onboarding: GuideSection = {
    key: "onboarding",
    title: "Onboarding & invites",
    summary: "Approve pending users and manage invitations.",
    icon: Users,
    checklist: [
        {
            heading: "Pending approvals",
            items: [
                "Switch to the Pending Activation card or enable “Show pending approval.”",
                "Select one or more pending users, review their registration details, then choose Approve to activate.",
                "Use Delete to remove abandoned or duplicated registrations before they clutter the list.",
            ],
        },
        {
            heading: "Invitations",
            items: [
                "Use Invite → From Employee Records for bulk RAMCO-based invites; duplicates are skipped automatically.",
                "Use Invite → Using Personal Email for contractors or ad-hoc access; set user type appropriately.",
                "After sending, pending entries appear in the Pending Activation grid until approved.",
            ],
        },
    ],
    tips: [
        "Method column on pending users shows whether the record came from self-signup or invitation.",
        "Keep contacts filled for faster verification when approvals pile up.",
    ],
};

export default onboarding;
