import React from "react";
import { cva, VariantProps } from "class-variance-authority";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";

const actionSidebarVariants = cva(
    // Fixed, full-viewport height; internal layout handles scrolling
    "fixed top-0 right-0 h-screen bg-stone-50 dark:bg-gray-800 border-gray-300 dark:border-gray-500 z-50 shadow-2xl rounded-tl-xl overflow-hidden",
    {
        variants: {
            size: {
                lg: "md:w-3/5 w-full max-w-[960px]",
                md: "md:w-1/2 w-full max-w-[768px]",
                sm: "md:w-1/3 w-full max-w-[480px]",
            },
        },
        defaultVariants: {
            size: "md",
        },
    }
);

interface ActionSidebarProps extends VariantProps<typeof actionSidebarVariants> {
    title: string;
    content: React.ReactNode;
    onClose: () => void;
    isOpen?: boolean;
}

const ActionSidebar: React.FC<ActionSidebarProps> = ({ title, content, onClose, size, isOpen = true }) => {
    if (!isOpen) return null;
    
    return (
        <div className={actionSidebarVariants({ size })}>
            <div className="flex h-full flex-col p-4">
                <div className="flex justify-between items-center mb-2 shrink-0">
                    <h2 className="text-lg font-semibold mr-4 truncate">{title}</h2>
                    <button
                        className="text-red-500 text-2xl font-bold hover:text-red-700"
                        data-sidebar-close onClick={onClose}
                        aria-label="Close sidebar"
                    >
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>
                <div className="text-sm whitespace-pre-wrap break-words overflow-auto pr-1 flex-1">
                    {content}
                </div>
            </div>
        </div>
    );
};

export default ActionSidebar;
