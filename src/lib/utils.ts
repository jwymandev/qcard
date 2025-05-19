import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Ensures a URL uses HTTPS protocol
 * This is essential when working with internal API requests to avoid SSL protocol mismatch errors
 * 
 * @param url The URL to enforce HTTPS on, either as string or URL object
 * @param request Optional NextRequest object to get the base URL from if url is a path
 * @returns String URL with HTTPS protocol
 */
export function ensureHttps(url: string | URL, request?: Request): string {
  // If it's a URL object, convert to string
  const urlString = url instanceof URL ? url.toString() : url;
  
  // Special case for localhost to avoid SSL errors in development
  // In development, we want to use HTTP for localhost to avoid certificate issues
  if (urlString.includes('localhost')) {
    // If it's an absolute URL with localhost and https://, convert to http://
    if (urlString.startsWith('https://localhost')) {
      return urlString.replace(/^https:\/\/localhost/i, 'http://localhost');
    }
    
    // If it's a relative URL and we have a localhost host in the request, use HTTP
    if (urlString.startsWith('/') && request) {
      const host = request.headers.get('host') || '';
      if (host.includes('localhost')) {
        return `http://${host}${urlString}`;
      }
    }
    
    // If it already has http:// for localhost, keep it
    if (urlString.startsWith('http://localhost')) {
      return urlString;
    }
  }
  
  // For production/staging URLs (non-localhost):
  
  // If it's an absolute URL with http://, convert to https://
  if (urlString.startsWith('http://') && !urlString.includes('localhost')) {
    return urlString.replace(/^http:\/\//i, 'https://');
  }
  
  // If it's a relative URL (starts with /) and we have a request object, use the request's base URL
  if (urlString.startsWith('/') && request) {
    // Get the host from the request
    const host = request.headers.get('host') || '';
    
    // Use HTTP for localhost, HTTPS for everything else
    if (host.includes('localhost')) {
      return `http://${host}${urlString}`;
    } else {
      return `https://${host}${urlString}`;
    }
  }
  
  // If it's already https:// or something else, return as is
  return urlString;
}