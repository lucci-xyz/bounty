'use client';

import { createContext, useContext, useMemo } from 'react';

/**
 * React context for feature flags.
 */
const FlagContext = createContext({});

/**
 * Provides feature flags to the component tree.
 *
 * @param {object} props
 * @param {object} props.value - Flags object to provide.
 * @param {React.ReactNode} props.children - Components that can access flags.
 */
export function FlagProvider({ children, value = {} }) {
  const memoizedValue = useMemo(() => value, [value]);

  return (
    <FlagContext.Provider value={memoizedValue}>
      {children}
    </FlagContext.Provider>
  );
}

/**
 * Returns the complete flags object from context.
 *
 * @returns {object}
 */
export function useFlags() {
  return useContext(FlagContext);
}

/**
 * Returns the value for a specific flag.
 *
 * @param {string} key - The flag key to look up.
 * @param {*} [fallback] - Optional fallback value if the flag is not set.
 * @returns {*}
 */
export function useFlag(key, fallback) {
  const flags = useFlags();
  if (Object.prototype.hasOwnProperty.call(flags, key)) {
    return flags[key];
  }
  return fallback;
}

