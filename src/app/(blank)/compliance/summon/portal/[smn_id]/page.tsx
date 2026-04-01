import React from 'react';
import SummonPortal from '@/components/compliance/summon-portal';

export default function Page({ params }: any) {
    const { smn_id } = React.use(params);
    return <SummonPortal smnId={smn_id} />;
}
