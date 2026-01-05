"use client";

import React from "react";
import CoreAsset from "./asset-record";

interface AssetRecordVehicleProps {
    typeId: number;
}

const AssetRecordVehicle: React.FC<AssetRecordVehicleProps> = ({ typeId }) => {
    return (
        <CoreAsset
            typeId={typeId}
            title="Vehicle Assets"
            showTypeCards={false}
            showAssetOnlyToggle={false}
        />
    );
};

export default AssetRecordVehicle;
