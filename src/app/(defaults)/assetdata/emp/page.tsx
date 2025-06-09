import EmpMgmtMain from '@components/assetmgmt/tabemp';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Employees Data',
};

const Employees = () => {
    return <EmpMgmtMain />;
};

export default Employees;