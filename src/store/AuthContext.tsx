import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { authenticatedApi } from '@/config/api';

// User role type
interface UserRole {
  id: number;
  name: string;
}

// User group type
interface UserGroup {
  id: number;
  name: string;
}

// Updated User type
interface User {
  id: number;
  email: string;
  username: string;
  contact: string;
  name: string;
  userType: number;
  status: number;
  lastNav: string;
  role: {
    id: number;
    name: string;
  };
  profile: {
    user_id: number;
    dob: string;
    location: string;
    job: string;
    profile_image_url: string;
  };
}

// Updated NavTree type
interface NavTree {
  navId: number;
  title: string;
  type: string;
  position: number;
  status: number;
  path: string | null;
  parent_nav_id: number | null;
  section_id: number | null;
  children: NavTree[] | null;
}

// Updated AuthData type to match API response
interface AuthData {
  token: string;
  user: User;
  usergroups: UserGroup[];
  navTree: NavTree[];
}

// Helper to extract AuthData from API response
function parseAuthApiResponse(apiResponse: any): AuthData {
  // Map profile_image_url to profileImage for frontend use if needed
  const user = apiResponse.data.user;
  if (user && user.profile && user.profile.profile_image_url && !user.profile.profileImage) {
    user.profile.profileImage = user.profile.profile_image_url;
  }
  return {
    token: apiResponse.token,
    user,
    usergroups: apiResponse.data.usergroups,
    navTree: apiResponse.data.navTree,
  };
}

// Helper to parse API login response into AuthData
export function parseLoginResponse(apiResponse: any): AuthData {
  const { token, data } = apiResponse;
  const user = data.user;
  if (user && user.profile && user.profile.profile_image_url && !user.profile.profileImage) {
    user.profile.profileImage = user.profile.profile_image_url;
  }
  return {
    token,
    user,
    usergroups: data.usergroups,
    navTree: data.navTree,
  };
}

interface AuthContextProps {
  authData: AuthData | null;
  setAuthData: (data: AuthData | null) => void;
  logout: () => void;
  refreshNavTree?: () => Promise<void>;
  updateNavTree: (newNavTree: NavTree[]) => void;
}

export const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authData, setAuthData] = useState<AuthData | null>(null);

  useEffect(() => {
    // Load auth data from localStorage on app load
    const storedAuthData = localStorage.getItem('authData');
    if (storedAuthData) {
      const parsed = JSON.parse(storedAuthData);
      setAuthData(parsed);
      // Fetch navTree from backend and set in state
      (async () => {
        try {
          if (parsed && parsed.user && parsed.user.id) {
            const response = await authenticatedApi.get(`/api/nav/access/${parsed.user.id}`);
            const navTreeRemote: NavTree[] = (response.data as { navTree: NavTree[] }).navTree;
            if (navTreeRemote) {
              setAuthData((prev) => prev ? { ...prev, navTree: navTreeRemote } : prev);
            }
          }
        } catch (e) {
          // Optionally handle error
        }
      })();
    }
  }, []);

  useEffect(() => {
    //console.log('AuthData in AuthProvider:', authData);
  }, [authData]);

  const handleSetAuthData = (data: AuthData | null) => {
    setAuthData(data);
    if (data) {
      // Exclude navTree from localStorage
      const { navTree, ...rest } = data;
      localStorage.setItem('authData', JSON.stringify(rest));
    } else {
      localStorage.removeItem('authData');
    }
  };

  const logout = () => {
    handleSetAuthData(null);
  };

  const updateNavTree = (newNavTree: NavTree[]) => {
    setAuthData((prevAuthData) => {
      if (prevAuthData) {
        const updatedAuthData = { ...prevAuthData, navTree: newNavTree };
        // Do NOT store navTree in localStorage
        const { navTree, ...rest } = updatedAuthData;
        localStorage.setItem('authData', JSON.stringify(rest));
        return updatedAuthData;
      }
      return prevAuthData;
    });
  };

  const refreshNavTree = async () => {
    if (!authData) return;
    try {
      // Use correct endpoint for navTree
      const response = await authenticatedApi.get(`/api/nav/access/${authData.user.id}`);
      const navTreeRemote: NavTree[] = (response.data as { navTree: NavTree[] }).navTree;
      if (navTreeRemote) {
        setAuthData((prevAuthData) => {
          if (prevAuthData) {
            const updatedAuthData: AuthData = { ...prevAuthData, navTree: navTreeRemote };
            const { navTree: navTreeLocal, ...rest } = updatedAuthData;
            localStorage.setItem('authData', JSON.stringify(rest));
            return updatedAuthData;
          }
          return prevAuthData;
        });
      }
    } catch (error) {
      // Optionally handle error (toast, etc.)
      console.error('Error refreshing navTree:', error);
    }
  };

  const value = { authData, setAuthData: handleSetAuthData, logout, refreshNavTree, updateNavTree };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};