import AssetMgmtMain from '@components/assetmgmt/tabasset';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Assets Data',
};

const Employees = () => {
    return <AssetMgmtMain />;
};

export default Employees;