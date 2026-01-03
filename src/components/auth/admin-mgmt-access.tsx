'use client';

import React, { useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AuthTemplate from "./AuthTemplate";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OTPInput } from "@/components/ui/otp-input";
import { Eye, EyeOff, Mail, ShieldCheck } from "lucide-react";
import { api } from "@/config/api";
import { AuthContext } from "@/store/AuthContext";
import CredentialSecurity from "@/utils/credentialSecurity";
import { toast } from "sonner";

type LoginResponse = {
    token: string;
    data: {
        user: any;
        usergroups: any[];
        navTree: any[];
    };
};

const AdminMgmtAccess = () => {
    const router = useRouter();
    const authContext = useContext(AuthContext);
    const [emailOrUsername, setEmailOrUsername] = useState("");
    const [password, setPassword] = useState("");
    const [pin, setPin] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [sendingPin, setSendingPin] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        if (authContext?.authData) {
            router.replace("/admin");
        }
    }, [authContext?.authData, router]);

    const isPinComplete = useMemo(() => pin.replace(/\D/g, "").length >= 6, [pin]);

    const sendPin = async () => {
        if (!emailOrUsername) {
            setMessage("Enter username or email to send PIN.");
            return;
        }
        setSendingPin(true);
        setMessage(null);
        try {
            await api.post("/api/auth/admin/pincode", { emailOrUsername });
            toast.success("PIN sent to admin email (role: 1).");
        } catch (error: any) {
            console.error("Failed to send admin PIN", error);
            toast.error(error?.response?.data?.message || "Failed to send PIN. Ensure backend endpoint exists.");
        } finally {
            setSendingPin(false);
        }
    };

    const handleUnlock = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            const response = await api.post<LoginResponse>("/api/auth/login", {
                emailOrUsername,
                password,
                pincode: pin,
                adminBypass: true,
            });

            const user = response.data.data.user;
            if (user?.role?.id !== 1) {
                setMessage("Access denied: admin role required.");
                setLoading(false);
                return;
            }

            let mergedUser = user;
            try {
                const accountRes = await api.get("/api/auth/account", {
                    headers: { Authorization: `Bearer ${response.data.token}` }
                });
                const accountData: any = accountRes.data;
                const nestedUser = typeof accountData.data === 'object' && accountData.data !== null && 'user' in accountData.data
                    ? (accountData.data as { user?: any }).user
                    : undefined;
                const accountUser = nestedUser ?? accountData.user ?? accountData.data ?? null;
                if (accountUser) {
                    mergedUser = { ...mergedUser, ...accountUser };
                }
            } catch (err) {
                console.warn("Could not refresh account info after admin login", err);
            }

            authContext?.setAuthData({
                token: response.data.token,
                user: mergedUser,
                usergroups: response.data.data.usergroups,
                navTree: response.data.data.navTree,
            });

            router.push("/admin");
        } catch (error: any) {
            console.error("Admin unlock failed", error);
            const apiMessage = error?.response?.data?.message;
            setMessage(apiMessage || "Unable to unlock admin during maintenance. Check credentials and PIN.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthTemplate
            title="Secure Admin Access"
            description={message || "Authenticate with admin credentials and email PIN to bypass maintenance lockout."}
            allowDuringMaintenance
        >
            <form onSubmit={handleUnlock} className="space-y-5">
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-white/80">Username or email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                        <Input
                            name="emailOrUsername"
                            placeholder="admin@example.com"
                            className="pl-10"
                            value={emailOrUsername}
                            onChange={(e) => setEmailOrUsername(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-semibold text-white/80">Password</label>
                    <div className="relative">
                        <Input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            placeholder="Enter password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="pr-10"
                        />
                        <Button
                        variant={'ghost'}
                            onClick={() => setShowPassword((s) => !s)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70"
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </Button>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-white/80">Admin PIN (emailed)</label>
                        <Button variant="outline" size="sm" className="bg-gray-600" onClick={sendPin} disabled={sendingPin || !emailOrUsername}>
                            {sendingPin ? "Sending..." : "Send PIN"}
                        </Button>
                    </div>
                    <div className="flex justify-center">
                        <OTPInput value={pin} onChange={setPin} length={6} />
                    </div>
                    <p className="text-[11px] text-white/60">PIN is emailed to admin accounts (role id: 1). Required while maintenance is active.</p>
                </div>

                <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-400" disabled={loading || !isPinComplete}>
                    {loading ? "Verifying..." : "Unlock admin"}
                </Button>

                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-white/70">
                    <ShieldCheck className="h-4 w-4 text-orange-200" />
                    <span>Only role ID 1 can unlock admin during maintenance.</span>
                </div>
            </form>
        </AuthTemplate>
    );
};

export default AdminMgmtAccess;
