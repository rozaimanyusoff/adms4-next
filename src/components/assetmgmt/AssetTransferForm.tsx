'use client';
import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "@/store/AuthContext";

// Types for form structure
interface Requestor {
    name: string;
    staffId: string;
    designation: string;
    typeOfChange: 'Staff' | 'Asset' | 'Non-Asset';
}
interface StaffTransfer {
    name: string;
    staffId: string;
    effectiveDate: string;
}
interface AssetTransferDetails {
    ownerName: string;
    ownerStaffId: string;
    location: string;
    costCenter: string;
    condition: string;
    brandModel: string;
    serialNo: string;
}
interface AssetTransfer {
    effectiveDate: string;
    current: AssetTransferDetails;
    new: AssetTransferDetails;
}
interface Reason {
    temporary: boolean;
    departmentRestructure: boolean;
    upgrading: boolean;
    resignation: boolean;
    relocation: boolean;
    others: boolean;
    othersText: string;
    disposal: boolean;
}
interface AssetTransferFormState {
    requestor: Requestor;
    staffTransfer: StaffTransfer;
    assetTransfer: AssetTransfer;
    reason: Reason;
}

const initialForm: AssetTransferFormState = {
    requestor: {
        name: "",
        staffId: "",
        designation: "",
        typeOfChange: "Asset",
    },
    staffTransfer: {
        name: "",
        staffId: "",
        effectiveDate: "",
    },
    assetTransfer: {
        effectiveDate: "",
        current: {
            ownerName: "",
            ownerStaffId: "",
            location: "",
            costCenter: "",
            condition: "",
            brandModel: "",
            serialNo: "",
        },
        new: {
            ownerName: "",
            ownerStaffId: "",
            location: "",
            costCenter: "",
            condition: "",
            brandModel: "",
            serialNo: "",
        },
    },
    reason: {
        temporary: false,
        departmentRestructure: false,
        upgrading: false,
        resignation: false,
        relocation: false,
        others: false,
        othersText: "",
        disposal: false,
    },
};

export default function AssetTransferForm() {
    const [form, setForm] = useState<AssetTransferFormState>(initialForm);
    const authContext = useContext(AuthContext);
    const user = authContext?.authData?.user;

    useEffect(() => {
        if (user) {
            setForm(prev => ({
                ...prev,
                requestor: {
                    ...prev.requestor,
                    name: user.name || prev.requestor.name,
                    staffId: user.username || user.email || prev.requestor.staffId,
                },
            }));
        }
    }, [user]);

    // Top-level keys for form
    type Section = keyof AssetTransferFormState;
    // For assetTransfer sub-sections
    type AssetTransferSubSection = 'current' | 'new';
    // For assetTransferDetails fields
    type AssetTransferDetailsField = keyof AssetTransferDetails;
    // For reason fields
    type ReasonField = keyof Reason;
    // For requestor fields
    type RequestorField = keyof Requestor;
    // For staffTransfer fields
    type StaffTransferField = keyof StaffTransfer;
    // For assetTransfer fields
    type AssetTransferField = keyof AssetTransfer;

    // Type-safe handleInput
    function handleInput(
        section: 'requestor',
        field: RequestorField,
        value: string
    ): void;
    function handleInput(
        section: 'staffTransfer',
        field: StaffTransferField,
        value: string
    ): void;
    function handleInput(
        section: 'assetTransfer',
        field: AssetTransferField,
        value: string
    ): void;
    function handleInput(
        section: 'assetTransfer',
        field: AssetTransferDetailsField,
        value: string,
        subSection: AssetTransferSubSection
    ): void;
    function handleInput(
        section: 'reason',
        field: ReasonField,
        value: string
    ): void;
    function handleInput(
        section: Section,
        field: string,
        value: string,
        subSection?: string
    ) {
        setForm((prev) => {
            if (section === 'assetTransfer' && (subSection === 'current' || subSection === 'new')) {
                return {
                    ...prev,
                    assetTransfer: {
                        ...prev.assetTransfer,
                        [subSection]: {
                            ...prev.assetTransfer[subSection],
                            [field]: value,
                        },
                    },
                };
            }
            return {
                ...prev,
                [section]: {
                    ...prev[section],
                    [field]: value,
                },
            };
        });
    }

    function handleReasonChange(field: ReasonField) {
        setForm((prev) => ({
            ...prev,
            reason: {
                ...prev.reason,
                [field]: !prev.reason[field],
            },
        }));
    }

    return (
        <form className="max-w-3xl mx-auto bg-white p-6 rounded shadow-md text-sm">
            <h2 className="text-lg font-bold mb-4 text-center">STAFF AND ASSET / NON-ASSET TRANSFER FORM</h2>
            {/* Section 1 */}
            <fieldset className="mb-6 border rounded p-4">
                <legend className="font-semibold">Section 1 - Requestor Details <span className="text-xs font-normal">(Executive and above)</span></legend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                    <div>
                        <label className="block font-medium">Name</label>
                        <input type="text" className="input" value={form.requestor.name} onChange={e => handleInput('requestor', 'name', e.target.value)} />
                    </div>
                    <div>
                        <label className="block font-medium">Staff ID</label>
                        <input type="text" className="input" value={form.requestor.staffId} onChange={e => handleInput('requestor', 'staffId', e.target.value)} />
                    </div>
                    <div>
                        <label className="block font-medium">Designation</label>
                        <input type="text" className="input" value={form.requestor.designation} onChange={e => handleInput('requestor', 'designation', e.target.value)} />
                    </div>
                </div>
                <div className="flex gap-6 mt-2">
                    <label className="inline-flex items-center">
                        <input type="checkbox" className="mr-1" checked={form.requestor.typeOfChange === 'Staff'} onChange={() => handleInput('requestor', 'typeOfChange', 'Staff')} />
                        Staff Transfer
                    </label>
                    <label className="inline-flex items-center">
                        <input type="checkbox" className="mr-1" checked={form.requestor.typeOfChange === 'Asset'} onChange={() => handleInput('requestor', 'typeOfChange', 'Asset')} />
                        Asset
                    </label>
                    <label className="inline-flex items-center">
                        <input type="checkbox" className="mr-1" checked={form.requestor.typeOfChange === 'Non-Asset'} onChange={() => handleInput('requestor', 'typeOfChange', 'Non-Asset')} />
                        Non-Asset
                    </label>
                </div>
            </fieldset>

            {/* Section 2 */}
            <fieldset className="mb-6 border rounded p-4">
                <legend className="font-semibold">Section 2 - Staff Transfer <span className="text-xs font-normal">(to fill in if related)</span></legend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block font-medium">Name</label>
                        <input type="text" className="input" value={form.staffTransfer.name} onChange={e => handleInput('staffTransfer', 'name', e.target.value)} />
                    </div>
                    <div>
                        <label className="block font-medium">Staff ID</label>
                        <input type="text" className="input" value={form.staffTransfer.staffId} onChange={e => handleInput('staffTransfer', 'staffId', e.target.value)} />
                    </div>
                    <div>
                        <label className="block font-medium">Effective Date</label>
                        <input type="date" className="input" value={form.staffTransfer.effectiveDate} onChange={e => handleInput('staffTransfer', 'effectiveDate', e.target.value)} />
                    </div>
                </div>
                <div className="mt-4">
                    <table className="w-full border text-xs">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border px-2 py-1">Details</th>
                                <th className="border px-2 py-1">Current</th>
                                <th className="border px-2 py-1">New</th>
                            </tr>
                        </thead>
                        <tbody>
                            {['Project/ District', 'Department', 'Section', 'Unit'].map((label) => (
                                <tr key={label}>
                                    <td className="border px-2 py-1">{label}</td>
                                    <td className="border px-2 py-1"></td>
                                    <td className="border px-2 py-1"></td>
                                </tr>
                            ))}
                            <tr>
                                <td className="border px-2 py-1">Supervisor</td>
                                <td className="border px-2 py-1">
                                    <div>Name:</div>
                                    <div>Staff ID:</div>
                                </td>
                                <td className="border px-2 py-1">
                                    <div>Name:</div>
                                    <div>Staff ID:</div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <div className="text-xs text-gray-500 mt-1">Please provide attachments for any substantial item details</div>
                </div>
            </fieldset>

            {/* Section 3 */}
            <fieldset className="mb-6 border rounded p-4">
                <legend className="font-semibold">Section 3 - Asset / Non-Asset Transfer <span className="text-xs font-normal">(to fill in if related)</span></legend>
                <div className="mb-2">
                    <label className="block font-medium">Effective Date</label>
                    <input type="date" className="input" value={form.assetTransfer.effectiveDate} onChange={e => handleInput('assetTransfer', 'effectiveDate', e.target.value)} />
                </div>
                <table className="w-full border text-xs mb-2">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border px-2 py-1">Details</th>
                            <th className="border px-2 py-1">Current</th>
                            <th className="border px-2 py-1">New</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border px-2 py-1">Asset/Non-Asset Owner</td>
                            <td className="border px-2 py-1">
                                <input type="text" className="input mb-1" placeholder="Name" value={form.assetTransfer.current.ownerName} onChange={e => handleInput('assetTransfer', 'ownerName', e.target.value, 'current')} />
                                <input type="text" className="input" placeholder="Staff ID" value={form.assetTransfer.current.ownerStaffId} onChange={e => handleInput('assetTransfer', 'ownerStaffId', e.target.value, 'current')} />
                            </td>
                            <td className="border px-2 py-1">
                                <input type="text" className="input mb-1" placeholder="Name" value={form.assetTransfer.new.ownerName} onChange={e => handleInput('assetTransfer', 'ownerName', e.target.value, 'new')} />
                                <input type="text" className="input" placeholder="Staff ID" value={form.assetTransfer.new.ownerStaffId} onChange={e => handleInput('assetTransfer', 'ownerStaffId', e.target.value, 'new')} />
                            </td>
                        </tr>
                        <tr>
                            <td className="border px-2 py-1">Location</td>
                            <td className="border px-2 py-1">
                                <input type="text" className="input" value={form.assetTransfer.current.location} onChange={e => handleInput('assetTransfer', 'location', e.target.value, 'current')} />
                            </td>
                            <td className="border px-2 py-1">
                                <input type="text" className="input" value={form.assetTransfer.new.location} onChange={e => handleInput('assetTransfer', 'location', e.target.value, 'new')} />
                            </td>
                        </tr>
                        <tr>
                            <td className="border px-2 py-1">Cost Center</td>
                            <td className="border px-2 py-1">
                                <input type="text" className="input" value={form.assetTransfer.current.costCenter} onChange={e => handleInput('assetTransfer', 'costCenter', e.target.value, 'current')} />
                            </td>
                            <td className="border px-2 py-1">
                                <input type="text" className="input" value={form.assetTransfer.new.costCenter} onChange={e => handleInput('assetTransfer', 'costCenter', e.target.value, 'new')} />
                            </td>
                        </tr>
                        <tr>
                            <td className="border px-2 py-1">Condition of Asset/Non-Asset</td>
                            <td className="border px-2 py-1">
                                <input type="text" className="input" value={form.assetTransfer.current.condition} onChange={e => handleInput('assetTransfer', 'condition', e.target.value, 'current')} />
                            </td>
                            <td className="border px-2 py-1">
                                <input type="text" className="input" value={form.assetTransfer.new.condition} onChange={e => handleInput('assetTransfer', 'condition', e.target.value, 'new')} />
                            </td>
                        </tr>
                        <tr>
                            <td className="border px-2 py-1">Brand/Model</td>
                            <td className="border px-2 py-1">
                                <input type="text" className="input" value={form.assetTransfer.current.brandModel} onChange={e => handleInput('assetTransfer', 'brandModel', e.target.value, 'current')} />
                            </td>
                            <td className="border px-2 py-1">
                                <input type="text" className="input" value={form.assetTransfer.new.brandModel} onChange={e => handleInput('assetTransfer', 'brandModel', e.target.value, 'new')} />
                            </td>
                        </tr>
                        <tr>
                            <td className="border px-2 py-1">Serial No. / Reg. No</td>
                            <td className="border px-2 py-1">
                                <input type="text" className="input" value={form.assetTransfer.current.serialNo} onChange={e => handleInput('assetTransfer', 'serialNo', e.target.value, 'current')} />
                            </td>
                            <td className="border px-2 py-1">
                                <input type="text" className="input" value={form.assetTransfer.new.serialNo} onChange={e => handleInput('assetTransfer', 'serialNo', e.target.value, 'new')} />
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div className="text-xs text-gray-500">Please provide attachments for any substantial item details</div>
            </fieldset>

            {/* Section 4 */}
            <fieldset className="mb-6 border rounded p-4">
                <legend className="font-semibold">Section 4 - Reason for Transfer/Change</legend>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <label className="inline-flex items-center">
                        <input type="checkbox" className="mr-1" checked={form.reason.temporary} onChange={() => handleReasonChange('temporary')} />
                        Temporary Assignment (&lt; 30 days)
                    </label>
                    <label className="inline-flex items-center">
                        <input type="checkbox" className="mr-1" checked={form.reason.departmentRestructure} onChange={() => handleReasonChange('departmentRestructure')} />
                        Department Restructure
                    </label>
                    <label className="inline-flex items-center">
                        <input type="checkbox" className="mr-1" checked={form.reason.upgrading} onChange={() => handleReasonChange('upgrading')} />
                        Upgrading/Promotion
                    </label>
                    <label className="inline-flex items-center">
                        <input type="checkbox" className="mr-1" checked={form.reason.resignation} onChange={() => handleReasonChange('resignation')} />
                        Resignation
                    </label>
                    <label className="inline-flex items-center">
                        <input type="checkbox" className="mr-1" checked={form.reason.relocation} onChange={() => handleReasonChange('relocation')} />
                        Relocation
                    </label>
                    <label className="inline-flex items-center">
                        <input type="checkbox" className="mr-1" checked={form.reason.others} onChange={() => handleReasonChange('others')} />
                        Others (please specify):
                        <input type="text" className="input ml-2" value={form.reason.othersText} onChange={e => handleInput('reason', 'othersText', e.target.value)} disabled={!form.reason.others} />
                    </label>
                    <label className="inline-flex items-center col-span-2">
                        <input type="checkbox" className="mr-1" checked={form.reason.disposal} onChange={() => handleReasonChange('disposal')} />
                        Disposal
                    </label>
                </div>
            </fieldset>
        </form>
    );
}

// Add some basic input styling
type InputProps = React.InputHTMLAttributes<HTMLInputElement>;
const inputClass = "border rounded px-2 py-1 w-full focus:ring focus:ring-blue-200";
function Input(props: InputProps) {
    return <input {...props} className={inputClass + (props.className ? ` ${props.className}` : "")} />;
}
