"use client";

import React from "react";
import CoreAsset from "./asset-record";

interface AssetRecordComputerProps {
    typeId: number;
}

const AssetRecordComputer: React.FC<AssetRecordComputerProps> = ({ typeId }) => {
    return (
        <CoreAsset
            typeId={typeId}
            title="Computer Assets"
            showTypeCards={false}
            showAssetOnlyToggle={false}
        />
    );
};

export default AssetRecordComputer;
