import React from 'react';
import { cva } from 'class-variance-authority';

const modalSizeVariants = cva('rounded-2xl bg-white dark:bg-gray-300 dark-text-dark-light shadow-lg p-6', {
    variants: {
        size: {
            sm: 'w-64',
            md: 'w-96',
            lg: 'w-lg',
        },
    },
    defaultVariants: {
        size: 'md',
    },
});

interface ModalProps {
    title: string;
    children: React.ReactNode;
    onClose: () => void;
    size?: 'sm' | 'md' | 'lg';
}

const Modal: React.FC<ModalProps> = ({ title, children, onClose, size = 'md' }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4 sm:px-0">
            <div
                className={modalSizeVariants({ size })}
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <button onClick={onClose} className="text-red-500 text-lg font-bold hover:text-red-600">&times;</button>
                </div>
                <div className="mb-4">{children}</div>
            </div>
        </div>
    );
};

export default Modal;
