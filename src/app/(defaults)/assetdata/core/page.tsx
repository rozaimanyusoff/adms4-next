import TabCore from '@components/assetmgmt/tabcore';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Core Assets',
};

const AssetCore = () => {
    return <TabCore />;
};

export default AssetCore;