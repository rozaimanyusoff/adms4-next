'use client';

import React, { useCallback, useEffect, useMemo, useState, useContext } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import useMaintenanceMode from "@/hooks/useMaintenanceMode";
import { AuthContext } from "@/store/AuthContext";
import { toast } from "sonner";
import { authenticatedApi } from "@/config/api";
import { Loader2, WifiOff, Mail, CheckCircle2, XCircle } from "lucide-react";
import { io, Socket } from "socket.io-client";

type EmailConfig = {
    host: string;
    port: number;
    user: string;
    from: string;
    password: string;
};

type EmailTestResult = {
    success: boolean;
    message: string;
};

type HealthStatus = {
    status?: "healthy" | "degraded" | "unhealthy" | string;
    message?: string;
    timestamp?: string;
    pool1?: { connected?: boolean; latency?: number };
    pool2?: { connected?: boolean; latency?: number };
};

const MaintenanceControl = () => {
    const { maintenance, isActive, saveMaintenance, clearMaintenance, loading, saving, lastSocketAt, refreshMaintenance } = useMaintenanceMode();
    const [active, setActive] = useState(isActive);
    const [message, setMessage] = useState(maintenance.message ?? "");
    const [until, setUntil] = useState(maintenance.until ?? "");
    const [updatedBy, setUpdatedBy] = useState(maintenance.updatedBy ?? "");
    const [health, setHealth] = useState<HealthStatus | null>(null);
    const [healthLoading, setHealthLoading] = useState(false);
    const [healthError, setHealthError] = useState<string | null>(null);
    const [lastSocketTs, setLastSocketTs] = useState<string | null>(null);
    const [emailConfig, setEmailConfig] = useState<EmailConfig | null>(null);
    const [emailConfigLoading, setEmailConfigLoading] = useState(false);
    const [testTo, setTestTo] = useState("");
    const [testSending, setTestSending] = useState(false);
    const [testResult, setTestResult] = useState<EmailTestResult | null>(null);
    const authContext = useContext(AuthContext);
    const token = authContext?.authData?.token;

    useEffect(() => {
        setActive(isActive);
        setMessage(maintenance.message ?? "");
        setUntil(maintenance.until ?? "");
        setUpdatedBy(maintenance.updatedBy ?? "");
    }, [isActive, maintenance.message, maintenance.until, maintenance.updatedBy]);

    const formattedUpdatedAt = useMemo(() => {
        if (!maintenance.updatedAt) return null;
        const dt = new Date(maintenance.updatedAt);
        if (Number.isNaN(dt.getTime())) return null;
        return dt.toLocaleString(undefined, { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" });
    }, [maintenance.updatedAt]);

    const formattedUntil = useMemo(() => {
        if (!until) return null;
        const dt = new Date(until);
        if (Number.isNaN(dt.getTime())) return null;
        return dt.toLocaleString(undefined, { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" });
    }, [until]);

    const fetchHealth = useCallback(async () => {
        setHealthLoading(true);
        setHealthError(null);
        try {
            const res = await authenticatedApi.get("/api/health");
            const data = (res.data as any)?.data ?? res.data ?? null;
            setHealth(data as HealthStatus);
        } catch (error) {
            console.error("Failed to load backend health", error);
            setHealthError("Unable to load backend health.");
        } finally {
            setHealthLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, 30000);
        return () => clearInterval(interval);
    }, [fetchHealth]);

    const fetchEmailConfig = useCallback(async () => {
        setEmailConfigLoading(true);
        try {
            const res = await authenticatedApi.get("/api/email/config");
            setEmailConfig(res.data as EmailConfig);
        } catch {
            setEmailConfig(null);
        } finally {
            setEmailConfigLoading(false);
        }
    }, []);

    useEffect(() => { fetchEmailConfig(); }, [fetchEmailConfig]);

    const handleSendTestEmail = async () => {
        if (!testTo) return;
        setTestSending(true);
        setTestResult(null);
        try {
            const res = await authenticatedApi.post("/api/email/test", { to: testTo });
            setTestResult({ success: true, message: (res.data as any)?.message ?? "Test email sent." });
        } catch (error: any) {
            const msg = error?.response?.data?.message ?? "Failed to send test email.";
            setTestResult({ success: false, message: msg });
        } finally {
            setTestSending(false);
        }
    };

    useEffect(() => {
        if (!token) return;
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "");
        let socket: Socket | null = null;
        try {
            socket = io(socketUrl, { auth: { token }, transports: ["websocket"] });
            socket.on("backend:health", (payload: HealthStatus) => {
                setHealth(payload);
                setHealthError(null);
                setLastSocketTs(new Date().toISOString());
            });
            socket.on("connect_error", (err) => {
                console.warn("Health socket connect error", err);
            });
        } catch (error) {
            console.error("Failed to init health socket", error);
        }
        return () => {
            socket?.disconnect();
        };
    }, [token]);

    const healthTimestamp = useMemo(() => {
        if (!health?.timestamp) return null;
        const dt = new Date(health.timestamp);
        if (Number.isNaN(dt.getTime())) return null;
        return dt.toLocaleString(undefined, { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" });
    }, [health?.timestamp]);

    const statusBadge = (() => {
        const status = (health?.status || "unknown").toLowerCase();
        if (status === "healthy") return { label: "Healthy", className: "bg-emerald-100 text-emerald-800 border-emerald-200" };
        if (status === "degraded") return { label: "Degraded", className: "bg-amber-100 text-amber-800 border-amber-200" };
        if (status === "unhealthy") return { label: "Unhealthy", className: "bg-rose-100 text-rose-800 border-rose-200" };
        return { label: "Unknown", className: "bg-slate-100 text-slate-800 border-slate-200" };
    })();

    const poolLine = (label: string, pool?: { connected?: boolean; latency?: number }) => {
        if (!pool) return null;
        const state = pool.connected ? "Connected" : "Disconnected";
        const latency = pool.latency != null ? `${pool.latency} ms` : "n/a";
        return `${label}: ${state} · ${latency}`;
    };

    const handleSave = async () => {
        try {
            const payload = {
                active,
                message: message || "We're performing planned maintenance.",
                until,
                updatedBy: updatedBy || "System Admin",
                updatedAt: new Date().toISOString(),
            };
            await saveMaintenance(payload);
            toast.success(active ? "Maintenance mode enabled." : "Maintenance settings saved.");
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to save maintenance status.");
        }
    };

    const handleDisable = async () => {
        try {
            await clearMaintenance();
            setActive(false);
            toast.success("Maintenance mode disabled.");
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to disable maintenance.");
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Maintenance mode</CardTitle>
                <CardDescription>Hide login/register screens and show the maintenance notice on AuthTemplate.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex flex-col gap-3 rounded-lg border border-slate-200/60 bg-slate-50/60 p-4 text-slate-800 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <p className="text-sm font-semibold text-slate-900">Backend health</p>
                            <p className="text-xs text-slate-600">Live status from /api/health (refreshes every 30s).</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
                            <Button type="button" size="sm" variant="outline" onClick={fetchHealth} disabled={healthLoading}>
                                {healthLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
                            </Button>
                        </div>
                    </div>
                    <div className="text-xs text-slate-700">
                        {healthError ? (
                            <div className="flex items-center gap-2 text-rose-700">
                                <WifiOff className="h-4 w-4" /> {healthError}
                            </div>
                        ) : (
                            <>
                                <p className="font-medium text-slate-800">{health?.message || "Waiting for health response..."}</p>
                                <div className="mt-1 flex flex-wrap gap-3 text-slate-600">
                                    {healthTimestamp && <span>Updated {healthTimestamp}</span>}
                                    {lastSocketTs && <span className="text-emerald-700">Live broadcast {new Date(lastSocketTs).toLocaleTimeString()}</span>}
                                    {poolLine("Pool 1", health?.pool1) && <span>{poolLine("Pool 1", health?.pool1)}</span>}
                                    {poolLine("Pool 2", health?.pool2) && <span>{poolLine("Pool 2", health?.pool2)}</span>}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-3 rounded-lg border border-slate-200/60 bg-slate-50/60 p-4 text-slate-800 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-slate-900">Toggle maintenance</p>
                            <p className="text-xs text-slate-600">When on, auth forms slide out and users see the maintenance banner.</p>
                        </div>
                        <Switch checked={active} onCheckedChange={setActive} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <Badge variant="outline" className={isActive ? "border-orange-300 bg-orange-50 text-orange-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}>
                            {isActive ? "Active" : "Off"}
                        </Badge>
                        {formattedUpdatedAt && <span>Updated {formattedUpdatedAt}</span>}
                        {maintenance.updatedBy && <span>• by {maintenance.updatedBy}</span>}
                        {lastSocketAt && <span className="text-emerald-700">Live {new Date(lastSocketAt).toLocaleTimeString()}</span>}
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <label htmlFor="maintenance-message" className="text-sm font-semibold text-slate-800">Maintenance message</label>
                        <Textarea
                            id="maintenance-message"
                            placeholder="e.g. We're upgrading databases to improve performance."
                            value={message}
                            onChange={(e) => setMessage((e.target as HTMLTextAreaElement).value)}
                            className="min-h-24"
                        />
                        <p className="text-xs text-slate-500">Shown on the left hero and right-side overlay.</p>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="maintenance-until" className="text-sm font-semibold text-slate-800">Planned return (optional)</label>
                        <Input
                            id="maintenance-until"
                            type="datetime-local"
                            value={until}
                            onChange={(e) => setUntil(e.target.value)}
                        />
                        <p className="text-xs text-slate-500">{formattedUntil ? `Users will see “Planned back by ${formattedUntil}”.` : "Leave empty if timing is unknown."}</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <label htmlFor="maintenance-updatedby" className="text-sm font-semibold text-slate-800">Scheduled by</label>
                    <Input
                        id="maintenance-updatedby"
                        placeholder="Admin name or team"
                        value={updatedBy}
                        onChange={(e) => setUpdatedBy(e.target.value)}
                    />
                    <p className="text-xs text-slate-500">Displayed on the maintenance overlay for accountability.</p>
                </div>

                <Separator />

                <div className="flex flex-col gap-3 rounded-lg border border-slate-200/60 bg-slate-50/60 p-4 text-slate-800 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <p className="text-sm font-semibold text-slate-900">Email testing</p>
                            <p className="text-xs text-slate-600">Verify SMTP configuration by sending a test email.</p>
                        </div>
                        <Mail className="h-4 w-4 text-slate-400" />
                    </div>

                    {emailConfigLoading ? (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Loader2 className="h-3 w-3 animate-spin" /> Loading email config...
                        </div>
                    ) : emailConfig ? (
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 sm:grid-cols-3">
                            <span><span className="font-medium text-slate-500">Host</span><br />{emailConfig.host}</span>
                            <span><span className="font-medium text-slate-500">Port</span><br />{emailConfig.port}</span>
                            <span><span className="font-medium text-slate-500">User</span><br />{emailConfig.user}</span>
                            <span><span className="font-medium text-slate-500">From</span><br />{emailConfig.from}</span>
                            <span><span className="font-medium text-slate-500">Password</span><br />{emailConfig.password}</span>
                        </div>
                    ) : (
                        <p className="text-xs text-rose-600">Unable to load email configuration.</p>
                    )}

                    <div className="flex gap-2">
                        <Input
                            type="email"
                            placeholder="recipient@example.com"
                            value={testTo}
                            onChange={(e) => { setTestTo(e.target.value); setTestResult(null); }}
                            className="flex-1"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleSendTestEmail}
                            disabled={testSending || !testTo}
                        >
                            {testSending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send test"}
                        </Button>
                    </div>

                    {testResult && (
                        <div className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${testResult.success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
                            {testResult.success
                                ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                : <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                            {testResult.message}
                        </div>
                    )}
                </div>

                <Separator />

                <div className="flex flex-wrap justify-end gap-3">
                    {isActive && (
                        <Button type="button" variant="outline" onClick={handleDisable} disabled={saving}>
                            {saving ? "Saving..." : "Disable maintenance"}
                        </Button>
                    )}
                    <Button type="button" onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : active ? "Enable & save" : "Save"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default MaintenanceControl;
