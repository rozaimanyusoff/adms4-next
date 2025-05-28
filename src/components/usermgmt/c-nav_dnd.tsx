import React, { useEffect, useState, useRef } from "react";
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import {
    SortableContext,
    useSortable,
    arrayMove,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import NavTreeView from "@components/layouts/ui/NavTreeView";
import { authenticatedApi } from "@/config/api";
import Modal from "@components/layouts/ui/modal";
import ActionSidebar from "@components/layouts/ui/ActionSidebar";

const NavigationMaintenance: React.FC = () => {
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
    // DND state
    const [activeId, setActiveId] = useState<string | null>(null);
    const [draggedNode, setDraggedNode] = useState<any | null>(null);

    useEffect(() => {
        authenticatedApi.get("/api/nav").then(res => {
            const data = res.data as any;
            if (data && data.navTree) {
                setNavTree(data.navTree as any[]);
            } else {
                setNavTree([]);
            }
        }).catch(() => setNavTree([]));
        // Fetch groups data
        authenticatedApi.get("/api/groups").then(res => {
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

    // DND-kit sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    // Helper: find node by id
    function findNodeById(nodes: any[], id: string): any | null {
        for (const node of nodes) {
            if (String(node.id) === String(id)) return node;
            if (node.children) {
                const found = findNodeById(node.children, id);
                if (found) return found;
            }
        }
        return null;
    }
    // Helper: remove node by id, returns [removedNode, newTree]
    function removeNodeById(nodes: any[], id: string): [any | null, any[]] {
        let removed: any = null;
        const newNodes = nodes.filter(n => {
            if (String(n.id) === String(id)) {
                removed = n;
                return false;
            }
            return true;
        }).map(n => {
            if (n.children) {
                const [childRemoved, newChildren] = removeNodeById(n.children, id);
                if (childRemoved) removed = childRemoved;
                return { ...n, children: newChildren };
            }
            return n;
        });
        return [removed, newNodes];
    }
    // Helper: insert node as child of parentId
    function insertNode(nodes: any[], parentId: string | null, node: any): any[] {
        if (!parentId) {
            return [...nodes, node];
        }
        return nodes.map(n => {
            if (String(n.id) === String(parentId)) {
                return { ...n, children: n.children ? [...n.children, node] : [node] };
            }
            if (n.children) {
                return { ...n, children: insertNode(n.children, parentId, node) };
            }
            return n;
        });
    }
    // Helper: get parent id of a node
    function findParentId(nodes: any[], id: string, parentId: string | null = null): string | null {
        for (const node of nodes) {
            if (String(node.id) === String(id)) return parentId;
            if (node.children) {
                const found = findParentId(node.children, id, String(node.id));
                if (found) return found;
            }
        }
        return null;
    }

    // DND handlers
    function handleDragStart(event: any) {
        setActiveId(event.active.id);
        setDraggedNode(findNodeById(navTree, event.active.id));
    }
    function handleDragEnd(event: any) {
        const { active, over } = event;
        setActiveId(null);
        setDraggedNode(null);
        if (!over || active.id === over.id) return;
        // Remove node from old position
        const [removedNode, treeWithout] = removeNodeById(navTree, active.id);
        if (!removedNode) return;
        // Insert node as child of over.id (or as root if over.id is null)
        const newTree = insertNode(treeWithout, over.id, removedNode);
        setNavTree(newTree);
        // Backend sync: send new tree structure
        authenticatedApi.post('/api/nav/reorder', { navTree: newTree });
    }
    function handleDragOver(event: any) {
        // Optionally, implement custom logic for drag-over (e.g., restrict drop targets)
    }

    // Open create form (optionally with parentId)
    function handleAddNav(parentId: string | number | null = null, parentNode: any = null) {
        let type = 'section';
        let sectionId = '';
        let parentNavId = '';
        // If adding a child to a level-1 node, set type to level-2, and set section/parent
        if (parentNode && parentNode.type === 'level-1') {
            type = 'level-2';
            parentNavId = parentNode.navId || parentNode.id || '';
            // Find the section ancestor for this level-1 node
            if (parentNode.parentNavId) {
                sectionId = parentNode.parentNavId;
            } else if (parentNode.sectionId) {
                sectionId = parentNode.sectionId;
            }
        }
        setFormState({
            navId: '',
            title: '',
            type,
            path: '',
            parentNavId: parentNavId ? String(parentNavId) : '',
            sectionId: sectionId ? String(sectionId) : '',
            status: '1',
            groups: []
        });
        setEditingNav(null);
        setSidebarOpen('create');
    }
    // Open edit form
    function handleEditNav(nav: any) {
        // Find all group IDs that have this nav.id in their navTree
        let groupIds: string[] = [];
        if (Array.isArray(groups) && nav.id) {
            groupIds = groups.filter(g => Array.isArray(g.navTree) && g.navTree.some((n: any) => String(n.id) === String(nav.id))).map(g => String(g.id));
        }
        setFormState({
            navId: nav.navId || nav.title || '',
            title: nav.title || '',
            type: nav.type || 'section',
            path: nav.path || '',
            parentNavId: nav.parentNavId || '',
            sectionId: nav.sectionId || '',
            status: nav.status || '1',
            groups: groupIds
        });
        setEditingNav(nav);
        setSidebarOpen('edit');
    }
    // Handle form submit
    async function handleFormSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (sidebarOpen === 'create') {
            await authenticatedApi.post('/api/nav', formState);
        } else if (sidebarOpen === 'edit' && editingNav) {
            await authenticatedApi.put(`/api/nav/${editingNav.id}`, formState);
        }
        setSidebarOpen(null);
        setEditingNav(null);
        // Refresh nav tree
        const res = await authenticatedApi.get('/api/nav');
        const data = res.data as any;
        setNavTree(data && data.navTree ? data.navTree : []);
    }

    // Sortable row component for dnd-kit
    function SortableNavRow({ node, level }: { node: any, level: number }) {
        const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id });
        return (
            <tr
                ref={setNodeRef}
                style={{
                    transform: CSS.Transform.toString(transform),
                    transition,
                    opacity: isDragging ? 0.5 : 1,
                }}
                className={
                    `hover:bg-amber-100 dark:hover:bg-gray-700` +
                    (editingNav && editingNav.id === node.id && sidebarOpen === 'edit' ? ' bg-blue-100 dark:bg-blue-900' : '')
                }
            >
                <td className={"drag-handle cursor-move px-2 py-1 border-b border-gray-100 dark:border-dark align-middle bg-gray-50 dark:bg-gray-800"} style={{ paddingLeft: 18 * level }}>
                    <span {...attributes} {...listeners} className="inline-block mr-2 cursor-grab text-gray-400">≡</span>
                    <span className={level === 0 ? "font-bold text-base ml-2" : level === 1 ? "font-semibold text-sm ml-2" : "font-normal text-xs ml-4 truncate"}>
                        {node.title}
                    </span>
                    {node.path && <a href={node.path} className="ml-2 text-blue-600 no-underline text-xs" target="_blank" rel="noopener noreferrer">{node.path}</a>}
                </td>
                <td className="px-2 py-1 border-b border-gray-100 dark:border-dark bg-gray-50 dark:bg-gray-800 text-start">
                    <span className="inline-flex gap-1 ml-2 items-center justify-end">
                        <button className="px-2 py-0.5 text-xs bg-amber-500 dark:bg-amber-700 hover:bg-amber-600 text-gray-700 dark:text-dark-light hover:text-white rounded-full" onClick={() => handleEditNav(node)}>Update</button>
                        {level < 2 && (
                            <button className="px-2 py-0.5 text-xs bg-blue-500 dark:bg-blue-800 hover:bg-blue-700 text-white dark:text-dark-light rounded-full" onClick={() => handleAddNav(node.id, node)}>+ Child</button>
                        )}
                    </span>
                </td>
                <td className="px-2 py-1 border-b border-gray-100 dark:border-dark bg-gray-50 dark:bg-gray-800 text-left">
                    <span className="inline-flex gap-1 ml-2 items-center justify-end">
                        {groups && groups.length > 0 ? (
                            groups.filter(g => Array.isArray(g.navTree) && g.navTree.some((n: any) => String(n.id) === String(node.id))).map(g => (
                                <span key={g.id} className="text-xs bg-sky-600 dark:bg-sky-700 text-white dark:text-dark-light px-2 py-0.5 rounded-full">{g.name}</span>
                            ))
                        ) : (
                            <span className="text-xs text-gray-500">No groups</span>
                        )}
                    </span>
                </td>
            </tr>
        );
    }

    // Recursive render for nav rows
    function renderNavRows(nodes: any[], level: number): React.ReactNode {
        return nodes.map((node) => [
            <SortableNavRow key={node.id} node={node} level={level} />,
            node.children && node.children.length > 0 ? renderNavRows(node.children, level + 1) : null
        ]);
    }

    return (
        <div className="p-2">
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-lg font-bold">Navigation Maintenance</h1>
                <button className="btn border-0 bg-green-600 dark:bg-green-700 text-white px-4 py-2 rounded-full shadow-none" onClick={() => handleAddNav(null)} type="button">
                    + Navigation
                </button>
            </div>
            <div className="overflow-x-auto">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                >
                    <table className="min-w-full border border-gray-100 dark:border-dark bg-white rounded-sm">
                        <tbody>
                            <SortableContext
                                items={allNavs.map(n => n.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {navTree && navTree.length > 0 && renderNavRows(navTree, 0)}
                            </SortableContext>
                        </tbody>
                    </table>
                    <DragOverlay>
                        {draggedNode ? (
                            <div className="px-4 py-2 bg-white dark:bg-gray-800 border rounded-sm shadow-sm text-base font-bold">
                                {draggedNode.title}
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>
            {/* Sidebar for create/edit nav */}
            {sidebarOpen && (
                <ActionSidebar
                    title={sidebarOpen === 'create' ? 'Create Navigation' : 'Edit Navigation'}
                    onClose={() => setSidebarOpen(null)}
                    size="md"
                    content={
                        <form onSubmit={handleFormSubmit} className="space-y-4 p-2">
                            <div>
                                <label className="block text-sm font-medium mb-1">Nav ID</label>
                                <input className="form-input w-full bg-gray-100" value={formState.navId} readOnly />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Title</label>
                                <input className="form-input w-full" value={formState.title} onChange={e => setFormState(f => ({ ...f, title: e.target.value }))} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Type</label>
                                <select className="form-select w-full" value={formState.type} onChange={e => setFormState(f => ({ ...f, type: e.target.value }))}>
                                    <option value="section">Section</option>
                                    <option value="level-1">Level 1</option>
                                    <option value="level-2">Level 2</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Path</label>
                                <input className="form-input w-full" value={formState.path} onChange={e => setFormState(f => ({ ...f, path: e.target.value.replace(/[^/a-zA-Z0-9_-]/g, '') }))} placeholder="/path" disabled={formState.type === 'section'} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Parent Nav</label>
                                <select className="form-select w-full" value={formState.parentNavId} onChange={e => setFormState(f => ({ ...f, parentNavId: e.target.value }))} disabled={formState.type === 'section'}>
                                    <option value="">None</option>
                                    {allNavs.map(n => (
                                        <option key={n.id} value={n.navId || n.title}>{n.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Section</label>
                                <select className="form-select w-full" value={formState.sectionId} onChange={e => setFormState(f => ({ ...f, sectionId: e.target.value }))} disabled={formState.type === 'section'}>
                                    <option value="">None</option>
                                    {allNavs.filter(n => n.type === 'section').map(n => (
                                        <option key={n.id} value={n.navId || n.title}>{n.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Status</label>
                                <select className="form-select w-full" value={formState.status || '1'} onChange={e => setFormState(f => ({ ...f, status: e.target.value }))}>
                                    <option value="1">Active</option>
                                    <option value="0">Inactive</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Groups</label>
                                <div className="flex flex-col gap-1 overflow-y-auto border rounded-sm p-2 bg-white dark:bg-gray-900">
                                    {groups.map(g => (
                                        <label key={g.id} className="inline-flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                className="form-checkbox"
                                                value={g.id}
                                                checked={formState.groups.includes(String(g.id))}
                                                onChange={e => {
                                                    const checked = e.target.checked;
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
                                <button type="button" className="btn bg-slate-400 text-white rounded-full" onClick={() => setSidebarOpen(null)}>Cancel</button>
                                <button type="submit" className="btn bg-green-600 text-white rounded-full">Save</button>
                            </div>
                        </form>
                    }
                />
            )}
        </div>
    );
};

export default NavigationMaintenance;