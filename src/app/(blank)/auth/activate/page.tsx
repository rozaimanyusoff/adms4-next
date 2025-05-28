import ComponentActivate from '@components/auth/c-activate';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Activate',
};

const Activate = () => {
    return <ComponentActivate />;
};

export default Activate;