import UserProfile from '@/components/usermgmt/user-profile';

import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'User Management - Profile',
};

const UserManagementProfilePage = () => {
    return (
        <div className="space-y-6">
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link href="#" className="text-primary hover:underline">
                        User Management
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>Profile</span>
                </li>
            </ul>
            <UserProfile>
                <UserProfile />
            </UserProfile>
        </div>
    );
};

export default UserManagementProfilePage;

