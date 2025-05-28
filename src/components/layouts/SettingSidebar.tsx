import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import Setting from './setting';

const CustomSidebar = ({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) => {
    return (
        <aside
            className={`fixed top-0 right-0 h-full md:w-80 w-full bg-stone-100 dark:bg-gray-700 shadow-2xl overflow-y-auto transform transition-transform duration-300 ${
                isOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
        >
            <button
                className="absolute top-4 right-4 z-10 text-red-600 hover:text-red-800"
                onClick={onClose}
            >
                <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
            </button>
            <div className="p-4">{children}</div>
        </aside>
    );
};

export default CustomSidebar;