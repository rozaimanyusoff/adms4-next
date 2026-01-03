import { Metadata } from "next";
import AdminMgmtAccess from "@/components/auth/admin-mgmt-access";

export const metadata: Metadata = {
    title: "Secure Admin Access",
};

export default function AdminMgmtPage() {
    return <AdminMgmtAccess />;
}
