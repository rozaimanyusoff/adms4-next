import UserProfile from "@components/usermgmt/profiles";
import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
   title: "User Profile",
   description: "Manage your user profile settings and information.",
};

const UserProfilePage = () => {
   return <UserProfile />;
};

export default UserProfilePage;