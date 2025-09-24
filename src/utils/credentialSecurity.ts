// Simple encryption/decryption utility for client-side credential storage
// Note: This provides basic obfuscation, not military-grade security
// For production, consider server-side session management instead

class CredentialSecurity {
  private static readonly key = 'adms4-remember-key-2024';

  // Simple XOR encryption (better than plain text, but still client-side)
  static encrypt(text: string): string {
    try {
      const encrypted = text
        .split('')
        .map((char, i) => 
          String.fromCharCode(
            char.charCodeAt(0) ^ this.key.charCodeAt(i % this.key.length)
          )
        )
        .join('');
      return btoa(encrypted); // Base64 encode
    } catch {
      return text; // Fallback to plain text if encryption fails
    }
  }

  static decrypt(encryptedText: string): string {
    try {
      const decoded = atob(encryptedText); // Base64 decode
      const decrypted = decoded
        .split('')
        .map((char, i) =>
          String.fromCharCode(
            char.charCodeAt(0) ^ this.key.charCodeAt(i % this.key.length)
          )
        )
        .join('');
      return decrypted;
    } catch {
      return encryptedText; // Fallback if decryption fails
    }
  }

  // Generate a device-specific identifier
  static getDeviceFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx && (ctx.textBaseline = 'top');
    ctx && (ctx.font = '14px Arial');
    ctx && ctx.fillText('Device fingerprint', 2, 2);
    
    return btoa(
      navigator.userAgent +
      screen.width + screen.height +
      new Date().getTimezoneOffset() +
      (canvas.toDataURL() || '')
    );
  }
}

export default CredentialSecurity;