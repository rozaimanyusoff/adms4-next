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

  const refreshToken = async () => {
    try {
      const response = await authenticatedApi.post('/api/auth/refresh-token');
      const data: any = response.data;
      if (response.status === 200 && data.token) {
        authContext.setAuthData({ ...authContext.authData!, token: data.token });
      } else {
        handleLogout();
      }
    } catch {
      handleLogout();
    }
  };

  const schedule = () => {
    const token = getToken();
    if (!token) return;
    const expiration = getTokenExpiration(token);
    if (!expiration) return;
    const now = Date.now();
    const refreshTime = expiration - refreshBeforeMs;
    if (refreshTime > now) {
      refreshTimeout = setTimeout(() => {
        refreshToken().finally(schedule); // Reschedule after refresh
      }, refreshTime - now);
    }
  };

  schedule();

  // Return cleanup function
  return () => {
    if (refreshTimeout) clearTimeout(refreshTimeout);
  };
}
