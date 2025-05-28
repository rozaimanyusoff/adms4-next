import React, { createContext, useState, useEffect, ReactNode } from 'react';

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
      setAuthData(JSON.parse(storedAuthData));
    }
  }, []);

  useEffect(() => {
    //console.log('AuthData in AuthProvider:', authData);
  }, [authData]);

  const handleSetAuthData = (data: AuthData | null) => {
    setAuthData(data);
    if (data) {
      localStorage.setItem('authData', JSON.stringify(data));
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
        localStorage.setItem('authData', JSON.stringify(updatedAuthData));
        return updatedAuthData;
      }
      return prevAuthData;
    });
  };

  return (
    <AuthContext.Provider value={{ authData, setAuthData: handleSetAuthData, logout, updateNavTree }}>
      {children}
    </AuthContext.Provider>
  );
};

// Export the parser for use after login
export { parseAuthApiResponse };