import React from "react";

export interface NavNode {
    navId: number
    title: string;
    type: string;
    position: number;
    status: number;
    path?: string | null;
    parentNavId?: string | null;
    sectionId?: string | null;
    children?: NavNode[] | null;
}

interface NavTreeViewProps {
    tree: NavNode[];
    className?: string;
    checkedNavIds?: string[];
    onToggleNav?: (navId: string, checked: boolean) => void;
}

const NavTreeView: React.FC<NavTreeViewProps> = ({ tree, className, checkedNavIds = [], onToggleNav }) => {
    // Render a flat tree: all nodes shown, children indented, no expand/collapse
    const renderNode = (node: NavNode, level = 0) => (
        <div key={node.navId} style={{ marginLeft: level * 18 }} className={`mb-1 ${level === 0 ? 'font-bold text-base' : level === 1 ? 'font-semibold text-sm' : 'font-normal text-xs'}`}>
            <div className={`flex items-center py-0.5 gap-1 ${level === 0 ? 'pl-0' : level === 1 ? 'pl-0' : 'pl-1'}`}>
                {onToggleNav && (
                    <input
                        type="checkbox"
                        checked={checkedNavIds.includes(String(node.navId))}
                        onChange={e => onToggleNav(String(node.navId), e.target.checked)}
                        className="w-4.5 h-4.5 form-checkbox"
                    />
                )}
                <span className={`text-gray-800 dark:text-gray-100`}>
                    <span className="mr-2 text-xs text-gray-500">[{node.navId}]</span>
                    {node.title}
                </span>
                {/* {node.path && (
                    <a href={node.path} className="ml-2 text-blue-600 no-underline text-xs" target="_blank" rel="noopener noreferrer">{node.path}</a>
                )} */}
            </div>
            {node.children && node.children.length > 0 && (
                <div className={level === 0 ? "ml-4  pl-2" : level === 1 ? "border-l border-gray-100 dark:border-gray-800 pl-2" : "ml-4 pl-2"}>
                    {node.children.map((child) => renderNode(child, level + 1))}
                </div>
            )}
        </div>
    );

    return (
        <div className={className || "mt-4"}>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-sm p-3 border border-gray-200 dark:border-gray-700">
                <div className="font-semibold my-1 text-gray-700 dark:text-gray-200 underline underline-offset-4">Navigation Structure</div>
                {tree && tree.length > 0 ? tree.map((node) => renderNode(node)) : <div className="text-gray-400 italic">No navigation structure</div>}
            </div>
        </div>
    );
};

export default NavTreeView;
