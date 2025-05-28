import ComponentLogin from '@components/auth/c-login';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Login',
};

const Login = () => {
    return <ComponentLogin />;
};

export default Login;