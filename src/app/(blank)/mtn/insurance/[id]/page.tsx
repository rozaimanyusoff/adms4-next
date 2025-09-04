import React from 'react';
import InsuranceDetail from '@/components/maintenance/insurance-detail';

export default async function InsuranceDetailPage(props: any) {
  const params = (await props?.params) || {};
  const id = params.id || '';
  return <InsuranceDetail insuranceId={String(id)} />;
}

