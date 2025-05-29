import React from "react";
import { cva, VariantProps } from "class-variance-authority";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";

const actionSidebarVariants = cva(
    "fixed top-0 right-0 h-full bg-stone-100 dark:bg-gray-800 p-4 border-gray-300 dark:border-gray-500 z-50 overflow-auto shadow-2xl",
    {
        variants: {
            size: {
                lg: "md:w-3/5 w-full",
                md: "md:w-1/2 w-full",
                sm: "md:w-1/3 w-full",
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
}

const ActionSidebar: React.FC<ActionSidebarProps> = ({ title, content, onClose, size }) => {
    return (
        <div className={actionSidebarVariants({ size })}>
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold">{title}</h2>
                <button
                    className="text-red-500 text-2xl font-bold hover:text-red-700"
                    data-sidebar-close onClick={onClose}
                >
                    <FontAwesomeIcon icon={faTimes} />
                </button>
            </div>
            <div className="text-sm whitespace-pre-wrap break-words">{content}</div>
        </div>
    );
};

export default ActionSidebar;