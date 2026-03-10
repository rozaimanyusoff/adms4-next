import UserDashboard from '@components/usermgmt/user-dashboard';
import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'User Dashboard',
    description: 'Overview of your account, profile details, and latest activity.',
};

const UserDashboardPage = () => {
    return <UserDashboard />;
};

export default UserDashboardPage;
