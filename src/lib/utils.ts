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
  
  // If it's an absolute URL with http://, convert to https://
  if (urlString.startsWith('http://')) {
    return urlString.replace(/^http:\/\//i, 'https://');
  }
  
  // If it's a relative URL (starts with /) and we have a request object, use the request's base URL
  if (urlString.startsWith('/') && request) {
    // Get the host from the request
    const host = request.headers.get('host') || '';
    return `https://${host}${urlString}`;
  }
  
  // If it's already https:// or something else, return as is
  return urlString;
}