import React, { useContext, useEffect, useState } from "react";
import NavTreeView from "@components/layouts/ui/NavTreeView";
import { authenticatedApi } from "@/config/api";
import Modal from "@components/layouts/ui/modal";
import ActionSidebar from "@components/layouts/ui/ActionSidebar";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faMinusCircle, faPencilSquare, faFolderPlus } from '@fortawesome/free-solid-svg-icons';
import { toast } from "sonner";
import { AuthContext } from '@/store/AuthContext';

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

    useEffect(() => {
        authenticatedApi.get("/api/nav").then(res => {
            const data = res.data as any;
            if (data && data.navTree) {
                setNavTree(data.navTree as any[]);
                if (updateNavTree) {
                    //updateNavTree(data.navTree);
                }
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
            if (sidebarOpen === 'create') {
                await authenticatedApi.post('/api/nav', payload);
                toast.success('Navigation item created successfully!');
            } else if (sidebarOpen === 'edit' && editingNav) {
                const navId = editingNav.navId || editingNav.id;
                if (navId) {
                    await authenticatedApi.put(`/api/nav/${navId}`, payload);
                    toast.success('Navigation item updated successfully!');
                }
            }
            if (refreshNavTree) {
                await refreshNavTree();
            }
        } catch (error) {
            toast.error('An error occurred while processing your request.');
        }
        setSidebarOpen(null);
        setEditingNav(null);
    }

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-lg font-bold">Navigation Maintenance</h1>
                <button className="btn border-0 bg-green-600 dark:bg-green-700 text-white px-4 py-1 rounded-full shadow-none" onClick={() => handleAddNav(null)} type="button">
                    <span className="mr-2">
                        <FontAwesomeIcon icon={faPlusCircle} size="xl" />
                    </span>
                    Navigation
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 dark:border-dark bg-white rounded-sm">
                    {/* <thead>
                <tr>
                  <th className="text-left px-2 py-1 border-b border-gray-200 w-64">Navigation Structure</th>
                </tr>
              </thead> */}
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
                    size="md"
                    content={
                        <form onSubmit={handleFormSubmit} className="space-y-4 p-2">
                            {/* Removed Nav ID field */}
                            <div>
                                <label className="block text-sm font-medium mb-1">Title</label>
                                <input className="form-input w-full" placeholder="Enter title" value={formState.title} onChange={e => setFormState(f => ({ ...f, title: e.target.value }))} required />
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
                                        <option key={n.navId} value={n.navId}>{n.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Section</label>
                                <select className="form-select w-full" value={formState.sectionId} onChange={e => setFormState(f => ({ ...f, sectionId: e.target.value }))} disabled={formState.type === 'section'}>
                                    <option value="">None</option>
                                    {allNavs.filter(n => n.type === 'section').map(n => (
                                        <option key={n.navId} value={n.navId}>{n.title}</option>
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
                                <div className="flex flex-col gap-1 overflow-y-auto border rounded-sm p-2 bg-white dark:bg-gray-900 dark:border-gray-500">
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
                                <button type="button" className="btn bg-slate-400 text-white rounded-full shadow-none border-none" onClick={() => setSidebarOpen(null)}>Cancel</button>
                                {sidebarOpen === 'edit' ? (
                                    <button type="submit" className="btn bg-amber-600 text-white rounded-full shadow-none border-none">Update</button>
                                ) : (
                                    <button type="submit" className="btn bg-green-600 text-white rounded-full shadow-none border-none">Save</button>
                                )}
                            </div>
                        </form>
                    }
                />
            )}
        </div>
    );

    // Helper: Render navigation rows recursively with checkboxes for each group, styled like NavTreeView
    function renderNavRows(nodes: any[], level: number): React.ReactNode {
        return nodes.map((node) => (
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
                            <button onClick={() => handleEditNav(node)}><FontAwesomeIcon icon={faPencilSquare} size="xl" className="text-amber-500" /></button>
                            {level < 2 && (
                                <button onClick={() => handleAddNav(node.navId, node)}><FontAwesomeIcon icon={faFolderPlus} size="xl" className="text-blue-500" /></button>
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
        ));
    }
};

export default NavigationMaintenance;