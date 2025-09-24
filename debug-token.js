// Debug utility to inspect JWT tokens
// Run this in browser console to inspect your current token

function inspectToken() {
    try {
        const authData = localStorage.getItem('authData');
        if (!authData) {
            console.log('❌ No authData found in localStorage');
            return;
        }
        
        const parsed = JSON.parse(authData);
        if (!parsed.token) {
            console.log('❌ No token found in authData');
            return;
        }
        
        const token = parsed.token;
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        const now = Date.now();
        const exp = payload.exp * 1000;
        const iat = payload.iat * 1000;
        
        console.log('🔍 TOKEN INSPECTION:');
        console.log('📅 Issued at:', new Date(iat).toLocaleString());
        console.log('📅 Expires at:', new Date(exp).toLocaleString());
        console.log('⏰ Time until expiry:', Math.max(0, exp - now), 'ms');
        console.log('⏰ Time until expiry:', Math.max(0, (exp - now) / 1000), 'seconds');
        console.log('⏰ Time until expiry:', Math.max(0, (exp - now) / 60000), 'minutes');
        console.log('🔄 Will refresh in:', Math.max(0, exp - now - 30000), 'ms (30s before expiry)');
        console.log('👤 User:', payload.sub || payload.user || 'Unknown');
        console.log('🏷️ Full payload:', payload);
        
        return {
            token,
            payload,
            expiresAt: exp,
            timeUntilExpiry: exp - now,
            timeUntilRefresh: Math.max(0, exp - now - 30000)
        };
    } catch (error) {
        console.error('❌ Error inspecting token:', error);
    }
}

// Auto-run
console.log('🚀 Token inspection utility loaded. Run inspectToken() to check your current token.');