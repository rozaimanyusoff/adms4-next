import type { Metadata } from "next";
import AssetTransferForm from "@/components/assetmgmt/asset-transfer-form";

export const metadata: Metadata = {
  title: "Asset Transfer Form",
  description: "Use this form to transfer an asset to another person or location within the organization.",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams?: {
    id?: string | string[];
  };
};

const AssetTransferFormPage = ({ searchParams }: PageProps) => {
  const idParam = searchParams?.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;

  return (
    <div className="w-full">
      <AssetTransferForm id={id} />
    </div>
  );
};

export default AssetTransferFormPage;
