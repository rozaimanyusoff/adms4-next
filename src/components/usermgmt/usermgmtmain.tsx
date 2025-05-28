'use client';
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Tabs, TabList, Tab, TabPanel } from 'react-tabs';
import Accounts from "./c-acc";
import Groups from "./c-group";
import Navigations from "./c-nav";
import Roles from "./c-role";

const UserMgmtMain = () => {
    const [tabTitle, setTabTitle] = useState("User Accounts");

    // Persistent tab selection
	const [selectedTab, setSelectedTab] = useState<number>(() => {
		const savedTab = localStorage.getItem('selectedTab');
		return savedTab ? parseInt(savedTab) : 0;
	});

	useEffect(() => {
		localStorage.setItem('selectedTab', selectedTab.toString());
	}, [selectedTab]);

	const handleTabChange = (index: number) => {
		setSelectedTab(index);
	};

	const tabTitles = ['Account', 'Roles', 'Group', 'Navigation'];

	const tabComponents = [
		<div>
			<Accounts />
		</div>,
		<div>
			<Roles />
		</div>,
		<div>
			<Groups />
		</div>,
		<div>
			<Navigations />
		</div>,
	];

    return (
        <>
            <ul className="mb-6 flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link href="#" className="text-primary hover:underline">
                        Admin
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>{tabTitles[selectedTab]}</span>
                </li>
            </ul>
            <div>
				<Tabs selectedIndex={selectedTab} onSelect={handleTabChange} className="flex flex-col w-full">
					{/* Tab List */}
					<TabList className="flex border-b">
						{tabTitles.map((title, index) => (
							<Tab
								key={index}
								className="mr-4 pb-2 cursor-pointer focus:outline-hidden"
								selectedClassName="border-b-2 border-blue-500"
							>
								{title}
							</Tab>
						))}
					</TabList>

					{/* Tab Panels */}
					<div className="mt-4">
						{tabComponents.map((component, index) => (
							<TabPanel key={index}>
								{component}
							</TabPanel>
						))}
					</div>
				</Tabs>
			</div>
        </>
    );
};

export default UserMgmtMain;