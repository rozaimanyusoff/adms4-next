import UserMgmtMain from '@components/usermgmt/usermgmtmain';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'User Management',
};

const Admin = () => {
    return <UserMgmtMain />;
};

export default Admin;