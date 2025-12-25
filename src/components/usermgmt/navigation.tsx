import React, { useContext, useEffect, useState } from "react";
import NavTreeView from "@components/ui/NavTreeView";
import { authenticatedApi } from "@/config/api";
import ActionSidebar from "@components/ui/action-aside";
import { Pencil, FolderPlus, Trash2, Plus, PlusCircle, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { AuthContext } from '@/store/AuthContext';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const NavigationMaintenance: React.FC = () => {
    const { refreshNavTree, updateNavTree } = useContext(AuthContext) || {};
    const [navTree, setNavTree] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [sidebarOpen, setSidebarOpen] = useState<null | 'create' | 'edit'>(null);
    const [editingNav, setEditingNav] = useState<any | null>(null);
    const [formState, setFormState] = useState({
        navId: '',
        title: '',
        type: 'section',
        path: '',
        parentNavId: '',
        sectionId: '',
        status: '1',
        groups: [] as string[]
    });
    const [pendingDeleteNav, setPendingDeleteNav] = useState<any | null>(null);
    const [reorderTimeoutId, setReorderTimeoutId] = useState<NodeJS.Timeout | null>(null);

    // Fetch nav tree from backend and update local state
    const fetchNavTree = async () => {
        try {
            const res = await authenticatedApi.get("/api/admin/nav");
            const data = res.data as any;
            setNavTree(data && data.navTree ? data.navTree : []);
            if (updateNavTree) {
                // Optionally update global context
                // updateNavTree(data.navTree);
            }
        } catch {
            setNavTree([]);
        }
    };

    useEffect(() => {
        fetchNavTree();
        // Fetch groups data
        authenticatedApi.get("/api/admin/groups").then(res => {
            const data = res.data as any;
            if (data && data.data) {
                setGroups(data.data as any[]);
            } else {
                setGroups([]);
            }
        }).catch(() => setGroups([]));
    }, []);

    // Helper: collect all navs for dropdowns
    const allNavs = React.useMemo(() => {
        const flat: any[] = [];
        function flatten(nodes: any[]) {
            nodes.forEach(n => {
                flat.push(n);
                if (n.children) flatten(n.children);
            });
        }
        flatten(navTree);
        return flat;
    }, [navTree]);

    // Open create form (optionally with parentId)
    function handleAddNav(parentId: string | number | null = null, parentNode: any = null) {
        let type = 'section';
        let sectionId = '';
        let parentNavId = '';
        if (parentNode) {
            if (parentNode.type === 'section') {
                // Adding child under section: should be level-1
                type = 'level-1';
                parentNavId = parentNode.navId ? String(parentNode.navId) : '';
                sectionId = parentNode.navId ? String(parentNode.navId) : '';
            } else if (parentNode.type === 'level-1') {
                // Adding child under level-1: should be level-2
                type = 'level-2';
                parentNavId = parentNode.navId ? String(parentNode.navId) : '';
                // Find the root section ancestor for this level-1 node
                let root = parentNode;
                while (root && root.type !== 'section' && root.parent_nav_id != null) {
                    root = allNavs.find(n => n.navId === root.parent_nav_id);
                }
                if (root && root.type === 'section') {
                    sectionId = String(root.navId);
                }
            }
        }
        setFormState({
            navId: '',
            title: '',
            type,
            path: '',
            parentNavId: parentNavId,
            sectionId: sectionId,
            status: '1',
            groups: []
        });
        setEditingNav(parentNode || null);
        setSidebarOpen('create');
    }
    // Open edit form
    function handleEditNav(nav: any) {
        // Find all group IDs that have this nav.navId in their navTree
        let groupIds: string[] = [];
        if (Array.isArray(groups) && nav.navId) {
            groupIds = groups.filter(g => Array.isArray(g.navTree) && g.navTree.some((n: any) => String(n.navId) === String(nav.navId))).map(g => String(g.id));
        }
        // Set parentNavId and sectionId for all nav types using latest API property names
        let parentNavId = '';
        let sectionId = '';
        if (nav.type === 'level-1' || nav.type === 'level-2') {
            parentNavId = nav.parent_nav_id != null ? String(nav.parent_nav_id) : '';
            sectionId = nav.section_id != null ? String(nav.section_id) : '';
        }
        setFormState({
            navId: nav.navId || nav.title || '',
            title: nav.title || '',
            type: nav.type || 'section',
            path: nav.path || '',
            parentNavId: parentNavId,
            sectionId: sectionId,
            status: nav.status != null ? String(nav.status) : '1',
            groups: groupIds
        });
        setEditingNav(nav);
        setSidebarOpen('edit');
    }
    // Handle form submit
    async function handleFormSubmit(e: React.FormEvent) {
        e.preventDefault();
        const payload = {
            ...formState,
            parentNavId: formState.parentNavId ? Number(formState.parentNavId) : null,
            sectionId: formState.sectionId ? Number(formState.sectionId) : null,
            status: formState.status ? Number(formState.status) : 1,
            navId: formState.navId ? Number(formState.navId) : undefined,
            groups: formState.groups // Always include groups for both create and update
        };
        try {
            if (sidebarOpen === 'edit' && editingNav) {
                // If parentNavId or sectionId changed, and this is a parent, update all children
                const isParent = Array.isArray(editingNav.children) && editingNav.children.length > 0;
                const parentChanged = (formState.parentNavId !== (editingNav.parent_nav_id ? String(editingNav.parent_nav_id) : '')) || (formState.sectionId !== (editingNav.section_id ? String(editingNav.section_id) : ''));
                if (isParent && parentChanged) {
                    // Move all children to follow the parent
                    for (const child of editingNav.children) {
                        await authenticatedApi.put(`/api/admin/nav/${child.navId}`, {
                            ...child,
                            parentNavId: formState.navId ? Number(formState.navId) : undefined,
                            sectionId: formState.sectionId ? Number(formState.sectionId) : undefined,
                        });
                    }
                }
            }
            if (sidebarOpen === 'create') {
                await authenticatedApi.post('/api/admin/nav', payload);
                toast.success('Navigation item created successfully!');
            } else if (sidebarOpen === 'edit' && editingNav) {
                const navId = editingNav.navId || editingNav.id;
                if (navId) {
                    await authenticatedApi.put(`/api/admin/nav/${navId}`, payload);
                    toast.success('Navigation item updated successfully!');
                }
            }
            await fetchNavTree();
            if (refreshNavTree) {
                await refreshNavTree();
            }
        } catch (error) {
            toast.error('An error occurred while processing your request.');
        }
        setSidebarOpen(null);
        setEditingNav(null);
    }
    // Handle delete nav (trigger dialog)
    function handleDeleteNav(nav: any) {
        if (!nav || !nav.navId) return;
        // Prevent delete if has children
        if (Array.isArray(nav.children) && nav.children.length > 0) {
            toast.error('Cannot delete a navigation item that still has children. Please remove or move all children first.');
            return;
        }
        setPendingDeleteNav(nav);
    }
    // Confirm delete nav (actual API call)
    async function confirmDeleteNav() {
        if (!pendingDeleteNav || !pendingDeleteNav.navId) return;
        try {
            await authenticatedApi.delete(`/api/admin/nav/${pendingDeleteNav.navId}`);
            toast.success('Navigation item deleted successfully!');
            await fetchNavTree();
            if (refreshNavTree) {
                await refreshNavTree();
            }
        } catch (error) {
            toast.error('Failed to delete navigation item.');
        }
        setPendingDeleteNav(null);
    }
    // --- Navigation promote/demote logic ---
    function findNodeAndParent(nodes: any[], navId: any, parent: any = null): { node: any, parent: any, index: number } | null {
        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            if (n.navId === navId) return { node: n, parent, index: i };
            if (n.children && n.children.length > 0) {
                const found = findNodeAndParent(n.children, navId, n);
                if (found) return found;
            }
        }
        return null;
    }

    function updatePositions(nodes: any[]) {
        nodes.forEach((n, idx) => {
            n.position = idx;
            if (n.children && n.children.length > 0) {
                updatePositions(n.children);
            }
        });
    }

    // Helper: Find root section for a node
    function findRootSection(node: any, allNodes: any[]): any {
        let current = node;
        while (current && current.type !== 'section' && current.parent_nav_id != null) {
            current = allNodes.find(n => n.navId === current.parent_nav_id);
        }
        return current && current.type === 'section' ? current : null;
    }

    // Helper: Flatten tree to array for lookup
    function flattenTree(nodes: any[]): any[] {
        const flat: any[] = [];
        function walk(arr: any[]) {
            arr.forEach(n => {
                flat.push(n);
                if (n.children) walk(n.children);
            });
        }
        walk(nodes);
        return flat;
    }

    // Helper: Build reorder payload for siblings (robust for all node types)
    function buildReorderPayload(siblings: any[], parent: any, tree: any[]) {
        const allNodes = flattenTree(tree);
        return siblings.map(n => {
            let parent_nav_id = parent ? parent.navId : null;
            let section_id = null;
            if (n.type === 'section') {
                parent_nav_id = null;
                section_id = null;
            } else if (n.type === 'level-1') {
                section_id = parent && parent.type === 'section' ? parent.navId : (n.section_id ?? null);
            } else if (n.type === 'level-2') {
                // Find root section for this node
                const rootSection = findRootSection(n, allNodes);
                section_id = rootSection ? rootSection.navId : null;
            }
            return {
                navId: n.navId,
                position: n.position,
                parent_nav_id,
                section_id
            };
        });
    }

    async function reorderNavOnBackend(siblings: any[], parent: any, tree: any[]) {
        const payload = { nodes: buildReorderPayload(siblings, parent, tree) };
        try {
            await authenticatedApi.put('/api/admin/nav/reorder', payload);
            // Don't immediately fetch the tree again to avoid conflicts
            // Only refresh after a successful backend update
            if (refreshNavTree) {
                setTimeout(async () => {
                    await refreshNavTree();
                }, 200);
            }
            // Show success message only once per batch
            // toast.success('Navigation order updated.');
        } catch (e) {
            // On error, refetch the tree to restore correct state
            await fetchNavTree();
            toast.error('Failed to update navigation order.');
        }
    }

    function handlePromoteNav(navId: any) {
        setNavTree(prevTree => {
            const tree = JSON.parse(JSON.stringify(prevTree));
            const found = findNodeAndParent(tree, navId);
            if (!found) return prevTree;

            const { node, parent, index } = found;
            // Special-case: when moving a section, only consider other sections at root level
            if (!parent && node.type === 'section') {
                const root = tree as any[];
                const sectionSiblings = root.filter((n: any) => n.type === 'section');
                const secIndex = sectionSiblings.findIndex((n: any) => n.navId === navId);
                if (secIndex > 0) {
                    const targetPrev = sectionSiblings[secIndex - 1];
                    // swap positions in the actual root array
                    const idxA = root.findIndex((n: any) => n.navId === node.navId);
                    const idxB = root.findIndex((n: any) => n.navId === targetPrev.navId);
                    if (idxA >= 0 && idxB >= 0) {
                        [root[idxB], root[idxA]] = [root[idxA], root[idxB]];
                        updatePositions(root);
                        // debounce and persist only sections' order
                        if (reorderTimeoutId) clearTimeout(reorderTimeoutId);
                        const newTimeoutId = setTimeout(() => {
                            reorderNavOnBackend(sectionSiblings.sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0)), null, tree);
                        }, 300);
                        setReorderTimeoutId(newTimeoutId);
                    }
                }
                return tree;
            }

            let siblings = parent ? parent.children : tree;

            if (index > 0) {
                // Swap with previous sibling
                [siblings[index - 1], siblings[index]] = [siblings[index], siblings[index - 1]];
                updatePositions(siblings);

                // Clear existing timeout and set new one for debouncing
                if (reorderTimeoutId) {
                    clearTimeout(reorderTimeoutId);
                }
                const newTimeoutId = setTimeout(() => {
                    reorderNavOnBackend(siblings, parent, tree);
                }, 300);
                setReorderTimeoutId(newTimeoutId);
            }
            return tree;
        });
    }

    function handleDemoteNav(navId: any) {
        setNavTree(prevTree => {
            const tree = JSON.parse(JSON.stringify(prevTree));
            const found = findNodeAndParent(tree, navId);
            if (!found) return prevTree;

            const { node, parent, index } = found;
            // Special-case: when moving a section, only consider other sections at root level
            if (!parent && node.type === 'section') {
                const root = tree as any[];
                const sectionSiblings = root.filter((n: any) => n.type === 'section');
                const secIndex = sectionSiblings.findIndex((n: any) => n.navId === navId);
                if (secIndex < sectionSiblings.length - 1 && secIndex >= 0) {
                    const targetNext = sectionSiblings[secIndex + 1];
                    // swap positions in the actual root array
                    const idxA = root.findIndex((n: any) => n.navId === node.navId);
                    const idxB = root.findIndex((n: any) => n.navId === targetNext.navId);
                    if (idxA >= 0 && idxB >= 0) {
                        [root[idxA], root[idxB]] = [root[idxB], root[idxA]];
                        updatePositions(root);
                        // debounce and persist only sections' order
                        if (reorderTimeoutId) clearTimeout(reorderTimeoutId);
                        const newTimeoutId = setTimeout(() => {
                            reorderNavOnBackend(sectionSiblings.sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0)), null, tree);
                        }, 300);
                        setReorderTimeoutId(newTimeoutId);
                    }
                }
                return tree;
            }

            let siblings = parent ? parent.children : tree;

            if (index < siblings.length - 1) {
                // Swap with next sibling
                [siblings[index], siblings[index + 1]] = [siblings[index + 1], siblings[index]];
                updatePositions(siblings);

                // Clear existing timeout and set new one for debouncing
                if (reorderTimeoutId) {
                    clearTimeout(reorderTimeoutId);
                }
                const newTimeoutId = setTimeout(() => {
                    reorderNavOnBackend(siblings, parent, tree);
                }, 300);
                setReorderTimeoutId(newTimeoutId);
            }
            return tree;
        });
    }

    return (
        <div className="mt-4">
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-lg font-bold">Navigation Maintenance</h1>
                <Button variant={'default'} onClick={() => handleAddNav(null)} type="button">
                    <span>
                        <Plus />
                    </span>
                    Nav
                </Button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 dark:border-dark bg-white rounded-sm">
                    <tbody>
                        {navTree && navTree.length > 0 && renderNavRows(navTree, 0)}
                    </tbody>
                </table>
            </div>
            {/* Sidebar for create/edit nav */}
            {sidebarOpen && (
                <ActionSidebar
                    title={sidebarOpen === 'create' && editingNav ? `Add navigation under "${editingNav.title || ''}"` : sidebarOpen === 'create' ? 'Create Navigation' : 'Edit Navigation'}
                    onClose={() => setSidebarOpen(null)}
                    size="sm"
                    content={
                        <form onSubmit={handleFormSubmit} className="space-y-4 p-2">
                            <div>
                                <Label className="mb-1">Title</Label>
                                <Input placeholder="Enter title" value={formState.title} onChange={e => setFormState(f => ({ ...f, title: e.target.value }))} required />
                            </div>
                            <div>
                                <Label className="mb-1">Type</Label>
                                <Select value={formState.type} onValueChange={v => setFormState(f => ({ ...f, type: v }))}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="section">Section</SelectItem>
                                        <SelectItem value="level-1">Level 1</SelectItem>
                                        <SelectItem value="level-2">Level 2</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="mb-1">Path</Label>
                                <Input value={formState.path} onChange={e => setFormState(f => ({ ...f, path: e.target.value.replace(/[^/a-zA-Z0-9_-]/g, '') }))} placeholder="/path" disabled={formState.type === 'section'} />
                            </div>
                            <div>
                                <Label className="mb-1">Parent Nav</Label>
                                <Select value={formState.parentNavId || undefined} onValueChange={v => setFormState(f => ({ ...f, parentNavId: v }))} disabled={formState.type === 'section'}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="None" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allNavs.map(n => (
                                            <SelectItem key={n.navId} value={String(n.navId)}>{n.title}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="mb-1">Section</Label>
                                <Select value={formState.sectionId || undefined} onValueChange={v => setFormState(f => ({ ...f, sectionId: v }))} disabled={formState.type === 'section'}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="None" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allNavs.filter(n => n.type === 'section').map(n => (
                                            <SelectItem key={n.navId} value={String(n.navId)}>{n.title}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="mb-1">Status</Label>
                                <Select value={formState.status || undefined} onValueChange={v => setFormState(f => ({ ...f, status: v }))}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">Active</SelectItem>
                                        <SelectItem value="0">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="mb-1">Groups</Label>
                                <div className="flex flex-col gap-1 overflow-y-auto border rounded-sm p-2 bg-white dark:bg-gray-900 dark:border-gray-500">
                                    {groups.map(g => (
                                        <label key={g.id} className="inline-flex items-center gap-2 text-sm">
                                            <Checkbox
                                                className="h-4.5 w-4.5"
                                                checked={formState.groups.includes(String(g.id))}
                                                onCheckedChange={checked => {
                                                    setFormState(f => {
                                                        const groupId = String(g.id);
                                                        let newGroups = Array.isArray(f.groups) ? [...f.groups] : [];
                                                        if (checked) {
                                                            if (!newGroups.includes(groupId)) newGroups.push(groupId);
                                                        } else {
                                                            newGroups = newGroups.filter(id => id !== groupId);
                                                        }
                                                        return { ...f, groups: newGroups };
                                                    });
                                                }}
                                            />
                                            {g.name}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end mt-4">
                                <Button type="button" variant="destructive" onClick={() => setSidebarOpen(null)}>Cancel</Button>
                                {sidebarOpen === 'edit' ? (
                                    <Button type="submit" variant="default">Update</Button>
                                ) : (
                                    <Button type="submit" variant="default">Save</Button>
                                )}
                            </div>
                        </form>
                    }
                />
            )}
            {/* AlertDialog for delete confirmation */}
            <AlertDialog open={!!pendingDeleteNav} onOpenChange={open => { if (!open) setPendingDeleteNav(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Navigation Item</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{pendingDeleteNav?.title}"? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPendingDeleteNav(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteNav} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );

    // Helper: Render navigation rows recursively with checkboxes for each group, styled like NavTreeView
    function renderNavRows(nodes: any[], level: number): React.ReactNode {
        // Always sort nodes by position before rendering
        const sortedNodes = [...nodes].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        return sortedNodes.map((node, idx, arr) => {
            // Determine chevron disabled state
            const isFirst = idx === 0;
            const isLast = idx === arr.length - 1;
            const canMove = node.type === 'section' || node.type === 'level-1' || node.type === 'level-2';
            return (
                <React.Fragment key={node.navId}>
                    <tr className={
                        `hover:bg-amber-100 dark:hover:bg-gray-700` +
                        (editingNav && editingNav.navId === node.navId && sidebarOpen === 'edit' ? ' bg-blue-100 dark:bg-blue-900' : '')
                    }>
                        <td className={`px-2 py-1 border-b border-gray-100 dark:border-dark align-middle bg-gray-50 dark:bg-gray-800`} style={{ paddingLeft: 18 * level }}>
                            <span className={level === 0 ? "font-bold text-base ml-2" : level === 1 ? "font-semibold text-sm ml-2" : "font-normal text-xs ml-4 truncate"}>
                                {node.title}
                            </span>
                            {node.path && <a href={node.path} className="ml-2 text-blue-600 no-underline text-xs" target="_blank" rel="noopener noreferrer">{node.path}</a>}
                        </td>
                        <td className="px-2 py-1 border-b border-gray-100 dark:border-dark bg-gray-50 dark:bg-gray-800 text-start">
                            <span className="inline-flex gap-2 items-center justify-end">
                                {node.status === 0 ? (
                                    <span className="ml-2 px-4 py-2 rounded-full bg-gray-400 dark:bg-gray-600 text-gray-700 dark:text-dark-light text-xs align-middle"></span>
                                ) : (
                                    <span className="ml-2 px-4 py-2 rounded-full bg-green-400 dark:bg-green-600 text-gray-700 dark:text-dark-light text-xs align-middle"></span>
                                )}
                                <span className="inline-flex items-center">
                                    <ChevronUp
                                        className={canMove && !isFirst ? 'cursor-pointer text-gray-700 hover:text-amber-600' : 'text-gray-300'}
                                        onClick={canMove && !isFirst ? () => handlePromoteNav(node.navId) : undefined}
                                    />
                                    <ChevronDown
                                        className={canMove && !isLast ? 'cursor-pointer text-gray-700 hover:text-amber-600' : 'text-gray-300'}
                                        onClick={canMove && !isLast ? () => handleDemoteNav(node.navId) : undefined}
                                    />
                                </span>
                                <Pencil size={20} className="text-amber-500" onClick={() => handleEditNav(node)} />
                                <Trash2 size={20} className="text-red-500" onClick={() => handleDeleteNav(node)} />
                                {level < 2 && (
                                    <FolderPlus size={20} className="text-blue-500" onClick={() => handleAddNav(node.navId, node)} />
                                )}
                            </span>
                        </td>
                        <td className="px-2 py-1 border-b border-gray-100 dark:border-dark bg-gray-50 dark:bg-gray-800 text-left">
                            <span className="inline-flex gap-1 ml-2 items-center justify-end">
                                {groups && groups.length > 0 ? (
                                    groups.filter(g => Array.isArray(g.navTree) && g.navTree.some((n: any) => String(n.navId) === String(node.navId))).map(g => (
                                        <span key={g.id} className="text-xs bg-sky-600 dark:bg-sky-700 text-white dark:text-dark-light px-2 py-0.5 rounded-full">{g.name}</span>
                                    ))
                                ) : (
                                    <span className="text-xs text-gray-500">No groups</span>
                                )}
                            </span>
                        </td>
                    </tr>
                    {node.children && node.children.length > 0 && renderNavRows(node.children, level + 1)}
                </React.Fragment>
            );
        });
    }
};

export default NavigationMaintenance;
