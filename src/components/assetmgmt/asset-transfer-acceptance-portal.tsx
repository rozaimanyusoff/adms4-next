"use client";
import AssetTransferPortal from "./asset-transfer-portal";

type Props = {
  transferId: string;
};

// Thin wrapper to provide an acceptance-focused title while reusing portal logic
export default function AssetTransferAcceptancePortal({ transferId }: Props) {
  return <AssetTransferPortal transferId={transferId} title="Asset Transfer Acceptance Portal" mode="acceptance" />;
}
