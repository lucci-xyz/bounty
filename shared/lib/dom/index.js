import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes while preserving later overrides.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

