"use client";

import React, { useEffect, useState } from 'react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { authenticatedApi } from '@/config/api';
import { Pencil, Trash } from 'lucide-react';

type Permission = { key: string; label: string; allowed: boolean };
type Member = { id: number | string; ramco_id?: string; full_name?: string; permissions?: Permission[] };
type ModuleNested = { id: number | string; name: string; description?: string; members?: Member[] };

const MgmtModuleNested: React.FC = () => {
    const [modules, setModules] = useState<ModuleNested[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);

    // simple edit state for member permissions
    const [editingMember, setEditingMember] = useState<{ moduleId: string | number; member: Member } | null>(null);

    useEffect(() => {
        async function fetchModules() {
            setLoading(true);
            try {
                const res: any = await authenticatedApi.get('/api/users/modules');
                const items: ModuleNested[] = res.data?.data || res.data || [];
                setModules(items);
            } catch (err) {
                setModules([]);
            } finally {
                setLoading(false);
            }
        }
        fetchModules();
    }, []);

    async function fetchMembersForModule(moduleId: string | number) {
        // if members already loaded, skip
        const m = modules.find(x => String(x.id) === String(moduleId));
        if (m && m.members && m.members.length) return;
        try {
            const res: any = await authenticatedApi.get(`/api/users/modules/${moduleId}/members`);
            const members: Member[] = res.data?.data || res.data || [];
            setModules(prev => prev.map(pm => pm.id === moduleId ? { ...pm, members } : pm));
        } catch (err) {
            // ignore
        }
    }

    function onToggle(value: string) {
        setExpanded(prev => prev === value ? null : value);
        const id = value?.replace(/^module-/, '');
        if (id) fetchMembersForModule(id);
    }

    async function saveMemberPermissions(moduleId: string | number, member: Member) {
        try {
            await authenticatedApi.put(`/api/users/modules/${moduleId}/members/${member.id}`, { permissions: member.permissions });
            // update local copy
            setModules(prev => prev.map(pm => pm.id === moduleId ? { ...pm, members: (pm.members || []).map(m => m.id === member.id ? member : m) } : pm));
            setEditingMember(null);
        } catch (err) {
            // ignore for now
        }
    }

    async function deleteMember(moduleId: string | number, memberId: string | number) {
        if (!confirm('Delete member?')) return;
        try {
            await authenticatedApi.delete(`/api/users/modules/${moduleId}/members/${memberId}`);
            setModules(prev => prev.map(pm => pm.id === moduleId ? { ...pm, members: (pm.members || []).filter(m => m.id !== memberId) } : pm));
        } catch (err) {
            // ignore
        }
    }

    return (
        <div className="p-4 max-w-4xl mx-auto">
            <h3 className="text-lg font-semibold mb-4">Modules (nested)</h3>
            {loading ? <div>Loading...</div> : (
                <Accordion type="single" collapsible className="space-y-2">
                    {modules.map((mod) => (
                        <AccordionItem key={mod.id} value={`module-${mod.id}`} className="border rounded">
                            <AccordionTrigger onClick={() => onToggle(`module-${mod.id}`)} className="px-4 py-3">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="font-medium">{mod.name}</div>
                                        <div className="text-sm text-gray-600">{mod.description}</div>
                                    </div>
                                    <div className="text-sm text-gray-500">{(mod.members || []).length} members</div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                                <div className="space-y-3">
                                    {(!mod.members || mod.members.length === 0) ? (
                                        <div className="text-sm text-gray-500">No members</div>
                                    ) : (
                                        mod.members.map((m) => (
                                            <div key={String(m.id)} className="p-2 border rounded bg-gray-50">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="font-medium">{m.full_name || m.ramco_id}</div>
                                                        <div className="text-xs text-gray-600">{m.ramco_id}</div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button size="sm" variant="ghost" onClick={() => setEditingMember({ moduleId: mod.id, member: m })}><Pencil size={14} /></Button>
                                                        <Button size="sm" variant="destructive" onClick={() => deleteMember(mod.id, m.id)}><Trash size={14} /></Button>
                                                    </div>
                                                </div>
                                                <div className="mt-2">
                                                    <div className="text-sm font-medium mb-1">Permissions</div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {(m.permissions || []).map((p) => (
                                                            <label key={p.key} className="inline-flex items-center gap-2 bg-white px-2 py-1 rounded border">
                                                                <input type="checkbox" checked={!!p.allowed} onChange={(e) => {
                                                                    const checked = (e.target as HTMLInputElement).checked;
                                                                    setModules(prev => prev.map(pm => pm.id === mod.id ? {
                                                                        ...pm,
                                                                        members: (pm.members || []).map(mm => mm.id === m.id ? { ...mm, permissions: (mm.permissions || []).map(pp => pp.key === p.key ? { ...pp, allowed: checked } : pp) } : mm)
                                                                    } : pm));
                                                                }} />
                                                                <span className="text-sm">{p.label}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}

                                    {/* editing panel */}
                                    {editingMember && String(editingMember.moduleId) === String(mod.id) && (
                                        <div className="p-3 border rounded bg-white">
                                            <div className="mb-2 font-medium">Editing: {editingMember.member.full_name || editingMember.member.ramco_id}</div>
                                            <div className="mb-2">
                                                <Label>Notes</Label>
                                                <Textarea value={editingMember.member.full_name || ''} onChange={(e) => setEditingMember(em => em ? { ...em, member: { ...em.member, full_name: (e.target as HTMLTextAreaElement).value } } : em)} />
                                            </div>
                                            <div className="flex gap-2 justify-end">
                                                <Button variant="secondary" onClick={() => setEditingMember(null)}>Cancel</Button>
                                                <Button onClick={() => editingMember && saveMemberPermissions(editingMember.moduleId, editingMember.member)}>Save</Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            )}
        </div>
    );
};

export default MgmtModuleNested;
