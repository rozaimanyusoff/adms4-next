import ComponentResetPassword from '@components/auth/c-resetpass';
import { Metadata } from 'next';
import React from 'react';

// Ensure this route is treated as dynamic to avoid static page data collection
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Reset Password',
};

const ResetPassword = () => {
    return <ComponentResetPassword />;
};

export default ResetPassword;
