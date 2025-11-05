import OrgTab from '@components/assetmgmt/taborg';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Organizations Data',
};

const Organizations = () => {
    return <OrgTab />;
};

export default Organizations;