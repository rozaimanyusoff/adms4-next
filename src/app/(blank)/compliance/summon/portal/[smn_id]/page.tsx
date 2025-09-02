import SummonPortal from '@/components/compliance/summon-portal';

export default function Page({ params }: any) {
    return <SummonPortal smnId={params?.smn_id} />;
}
