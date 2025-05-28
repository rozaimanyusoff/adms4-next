import ComponentResetPassword from '@components/auth/c-resetpass';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Reset Password',
};

const ResetPassword = () => {
    return <ComponentResetPassword />;
};

export default ResetPassword;