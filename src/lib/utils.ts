// Centralized utility functions for enterprise-grade validation and UI helpers

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Timestamp } from 'firebase/firestore';

/**
 * Merges Tailwind classes using clsx and tailwind-merge.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely converts various date-like inputs (Firestore Timestamps, numbers, strings) to a Date object.
 */
export function toSafeDate(date: any): Date {
  if (!date) return new Date();
  if (date instanceof Date) return date;
  
  // Handle Firestore Timestamp object (both SDK instance and raw object)
  if (typeof date.toDate === 'function') return date.toDate();
  if (date && typeof date === 'object' && 'seconds' in date) {
    return new Timestamp(date.seconds, date.nanoseconds || 0).toDate();
  }
  
  if (typeof date === 'number') return new Date(date);
  
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return new Date();
  return parsed;
}

/**
 * Validates an Indian phone number format.
 * Supports: +91, 91, or 10-digit formats starting with 6-9.
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^(\+91[\-\s]?)?[0]?(91)?[6789]\d{9}$/;
  // Stripping spaces and dashes for internal character-based length check
  const simplePhone = phone.replace(/[\s\-\+]/g, '');
  return phoneRegex.test(phone) && simplePhone.length >= 10;
};

/**
 * Strips whitespace and extra formatting from string inputs.
 */
export const sanitizeInput = (input: string): string => {
  return input.trim();
};

/**
 * Formats currency values consistently.
 */
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(price);
};
