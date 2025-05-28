import ComponentForgotPassword from '@components/auth/c-forgotpass';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Forgot Password',
};

const ForgotPassword = () => {
    return <ComponentForgotPassword />;
};

export default ForgotPassword;