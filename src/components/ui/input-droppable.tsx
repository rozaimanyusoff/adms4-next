import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputDroppableProps extends React.InputHTMLAttributes<HTMLInputElement> {
    onFileDrop?: (file: File) => void;
    disabled?: boolean;
}

export const InputDroppable = React.forwardRef<HTMLInputElement, InputDroppableProps>(
    ({ className, type, onFileDrop, disabled, ...props }, ref) => {
        const [isDragActive, setIsDragActive] = React.useState(false);
        const [isProcessing, setIsProcessing] = React.useState(false);
        const inputRef = React.useRef<HTMLInputElement | null>(null);

        const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            setIsDragActive(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                onFileDrop?.(file);
                if (inputRef.current) {
                    inputRef.current.files = e.dataTransfer.files;
                    // Trigger onChange event programmatically
                    const changeEvent = new Event('change', { bubbles: true });
                    inputRef.current.dispatchEvent(changeEvent);
                }
            }
        };

        return (
            <div
                className={cn(
                    "relative flex flex-col items-center justify-center border-2 border-dashed rounded-md transition-colors",
                    isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white",
                    disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-gray-400",
                    className
                )}
                onDragOver={e => {
                    e.preventDefault();
                    setIsDragActive(true);
                }}
                onDragLeave={e => {
                    e.preventDefault();
                    setIsDragActive(false);
                }}
                onDrop={handleDrop}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!disabled && !isProcessing && inputRef.current) {
                        setIsProcessing(true);
                        inputRef.current.click();
                        // Reset processing state after a short delay
                        setTimeout(() => setIsProcessing(false), 100);
                    }
                }}
                tabIndex={disabled ? -1 : 0}
                role="button"
                aria-label="Upload file"
            >
                <input
                    ref={el => {
                        inputRef.current = el;
                        if (typeof ref === "function") ref(el);
                        else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
                    }}
                    type={type || "file"}
                    className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                    {...props}
                />
                <div className="py-6 text-center pointer-events-none select-none">
                    <div className="text-2xl mb-2">📄</div>
                    <div className="text-sm text-gray-500">Drag & drop PDF or click to upload</div>
                    <div className="text-xs text-gray-400 mt-1">PDF files only</div>
                </div>
            </div>
        );
    }
);
InputDroppable.displayName = "InputDroppable";
