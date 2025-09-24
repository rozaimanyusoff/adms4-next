// src/config/scheduleTokenRefresh.ts
// Utility to schedule token refresh before expiry

import { authenticatedApi } from '@/config/api';

// Use the interface definition directly since it's not exported
interface AuthContextProps {
  authData: any;
  setAuthData: (data: any) => void;
  logout: () => void;
}

export type TokenRefreshConfig = {
  getToken: () => string | null;
  authContext: AuthContextProps;
  refreshBeforeMs: number; // ms before expiry to refresh
  handleLogout: () => void;
};

export function scheduleTokenRefresh({
  getToken,
  authContext,
  refreshBeforeMs,
  handleLogout,
}: TokenRefreshConfig) {
  let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

  const getTokenExpiration = (token: string): number | null => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp ? payload.exp * 1000 : null;
    } catch {
      return null;
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    console.log('🔄 Attempting token refresh...');
    try {
      const response = await authenticatedApi.post('/api/auth/refresh-token');
      const data: any = response.data;
      if (response.status === 200 && data.token) {
        console.log('✅ Token refresh successful');
        authContext.setAuthData({ ...authContext.authData!, token: data.token });
        return true;
      } else {
        console.warn('❌ Token refresh failed: Invalid response', data);
        handleLogout();
        return false;
      }
    } catch (error) {
      console.warn('❌ Token refresh failed:', error);
      handleLogout();
      return false;
    }
  };

  const schedule = () => {
    const token = getToken();
    if (!token) {
      console.log('⚠️ No token found, skipping refresh scheduling');
      return;
    }
    const expiration = getTokenExpiration(token);
    if (!expiration) {
      console.log('⚠️ No expiration found in token, skipping refresh scheduling');
      return;
    }
    const now = Date.now();
    const refreshTime = expiration - refreshBeforeMs;
    
    console.log(`⏰ Token expires at: ${new Date(expiration).toLocaleTimeString()}`);
    console.log(`⏰ Will refresh at: ${new Date(refreshTime).toLocaleTimeString()}`);
    console.log(`⏰ Time until refresh: ${Math.max(0, refreshTime - now)}ms`);
    
    if (refreshTime > now) {
      refreshTimeout = setTimeout(async () => {
        const success = await refreshToken();
        if (success) {
          schedule(); // Reschedule only if refresh succeeded
        }
        // If refresh failed, handleLogout was already called, so don't reschedule
      }, refreshTime - now);
    } else {
      console.log('⚠️ Token refresh time has already passed, refreshing immediately');
      refreshToken().then(success => {
        if (success) schedule();
      });
    }
  };

  schedule();

  // Return cleanup function
  return () => {
    if (refreshTimeout) clearTimeout(refreshTimeout);
  };
}
