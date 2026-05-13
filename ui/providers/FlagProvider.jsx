'use client';

import { createContext, useContext } from 'react';

const FlagContext = createContext({});

export function FlagProvider({ children, value = {} }) {
  return <FlagContext.Provider value={value}>{children}</FlagContext.Provider>;
}

export function useFlags() {
  return useContext(FlagContext);
}

export function useFlag(key, fallback) {
  const flags = useFlags();
  return Object.hasOwn(flags, key) ? flags[key] : fallback;
}
