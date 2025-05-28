import TabSite from '@components/assetmgmt/tabsite';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Site Data',
};

const AssetSite = () => {
    return <TabSite />;
};

export default AssetSite;