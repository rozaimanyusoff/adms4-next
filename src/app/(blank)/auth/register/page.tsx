import ComponentRegister from '@components/auth/c-register';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Register',
};

const Register = () => {
    return <ComponentRegister />;
};

export default Register;