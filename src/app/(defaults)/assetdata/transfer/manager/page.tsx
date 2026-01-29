import AssetTransferManager from '@components/assetmgmt/asset-transfer-manager';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Asset Transfer Manager',
};

export default function AssetTransferManagerPage() {
    return <AssetTransferManager />;
}
