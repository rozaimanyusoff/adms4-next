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
interface UserProfileInfo {
  user_id?: number;
  dob?: string;
  location?: string;
  job?: string;
  profile_image_url?: string;
  profileImage?: string;
}

interface User {
  id: number;
  email: string;
  username: string;
  contact: string;
  name: string;
  avatar?: string | null;
  userType: number;
  status: number;
  lastNav: string;
  role: {
    id: number;
    name: string;
  };
  profile?: UserProfileInfo | null;
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
  navTree?: NavTree[];
}

const normalizeUser = (user: any): User => {
  if (!user) {
    return user;
  }

  const normalizedUser: User = {
    ...user,
  };

  const profile: UserProfileInfo = {
    ...(normalizedUser.profile ?? {}),
  };

  const profileImage =
    profile.profileImage ||
    profile.profile_image_url ||
    normalizedUser.avatar ||
    undefined;

  if (profileImage) {
    profile.profileImage = profileImage;
    profile.profile_image_url = profile.profile_image_url || profileImage;
    if (!normalizedUser.avatar) {
      normalizedUser.avatar = profileImage;
    }
  }

  normalizedUser.profile = profile;

  return normalizedUser;
};

const normalizeAuthData = (data: AuthData): AuthData => {
  return {
    ...data,
    user: normalizeUser(data.user),
  };
};

// Helper to extract AuthData from API response
function parseAuthApiResponse(apiResponse: any): AuthData {
  const user = normalizeUser(apiResponse.data.user);
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
  const user = normalizeUser(data.user);
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
      if (parsed && parsed.user) {
        const normalized = normalizeAuthData(parsed as AuthData);
        setAuthData(normalized);
      } else {
        setAuthData(parsed);
      }
      // Fetch navTree from backend and set in state
      (async () => {
        try {
          const userId = (parsed && parsed.user && parsed.user.id) || undefined;
          if (userId) {
            const response = await authenticatedApi.get(`/api/admin/nav/access/${userId}`);
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
    if (data) {
      const normalizedData = normalizeAuthData(data);
      setAuthData(normalizedData);
      // Exclude navTree from localStorage
      const { navTree, ...rest } = normalizedData;
      localStorage.setItem('authData', JSON.stringify(rest));
    } else {
      setAuthData(null);
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
      const response = await authenticatedApi.get(` /api/admin/nav/access/${authData.user.id}`);
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
