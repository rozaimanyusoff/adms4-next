import TabOrg from '@components/assetmgmt/taborg';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Organization Data',
};

const AssetOrg = () => {
    return <TabOrg />;
};

export default AssetOrg;