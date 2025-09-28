import ComponentRegister from '@components/auth/register';
import { Metadata } from 'next';
import React from 'react';

// Ensure this route is treated as dynamic to avoid static page data collection
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Register',
};

const Register = () => {
    return <ComponentRegister />;
};

export default Register;
