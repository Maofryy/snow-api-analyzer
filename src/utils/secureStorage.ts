// Secure credential storage utilities
// This provides basic obfuscation for client-side storage - NOT cryptographically secure
// For production use, implement proper server-side credential management

interface SecureCredentials {
  url: string;
  username: string;
  password: string;
  token: string;
}

const STORAGE_KEY = 'snow_benchmark_credentials';

// Basic obfuscation for client-side storage (NOT secure encryption)
// In production, use proper server-side credential management
function obfuscate(text: string): string {
  if (!text) return '';
  return btoa(text.split('').reverse().join(''));
}

function deobfuscate(obfuscated: string): string {
  if (!obfuscated) return '';
  try {
    return atob(obfuscated).split('').reverse().join('');
  } catch {
    return '';
  }
}

export function storeCredentials(credentials: SecureCredentials): void {
  try {
    const obfuscated = {
      url: credentials.url, // URL can be visible
      username: obfuscate(credentials.username),
      password: obfuscate(credentials.password),
      token: obfuscate(credentials.token)
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obfuscated));
  } catch (error) {
    console.error('Failed to store credentials:', error);
  }
}

export function retrieveCredentials(): SecureCredentials | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const obfuscated = JSON.parse(stored);
    return {
      url: obfuscated.url || '',
      username: deobfuscate(obfuscated.username || ''),
      password: deobfuscate(obfuscated.password || ''),
      token: deobfuscate(obfuscated.token || '')
    };
  } catch (error) {
    console.error('Failed to retrieve credentials:', error);
    return null;
  }
}

export function clearCredentials(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear credentials:', error);
  }
}

// Sanitize URL input to prevent injection attacks
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  
  // Remove any potentially harmful characters
  const sanitized = url.replace(/[<>'"]/g, '');
  
  // Ensure URL starts with https:// for security
  if (!sanitized.startsWith('https://') && !sanitized.startsWith('http://')) {
    return sanitized.startsWith('//') ? `https:${sanitized}` : `https://${sanitized}`;
  }
  
  return sanitized;
}

// Sanitize string inputs to prevent injection
export function sanitizeString(input: string): string {
  if (!input) return '';
  return input.replace(/[<>'"&]/g, '');
}

// Create secure Basic Auth header
export function createSecureAuthHeader(username: string, password: string): string {
  const sanitizedUsername = sanitizeString(username);
  const sanitizedPassword = sanitizeString(password);
  return `Basic ${btoa(`${sanitizedUsername}:${sanitizedPassword}`)}`;
}