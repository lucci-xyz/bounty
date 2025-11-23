'use client';
import { logger } from '@/shared/lib/logger';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const NetworkContext = createContext(null);

function getFallbackAlias(registry, group) {
  if (!registry) {
    return null;
  }
  const entry = Object.entries(registry).find(([, config]) => config.group === group);
  return entry ? entry[0] : null;
}

export function NetworkProvider({ children }) {
  const [registry, setRegistry] = useState(null);
  const [networkGroup, setNetworkGroup] = useState('testnet');
  const [defaultAlias, setDefaultAlias] = useState(null);
  const [selectedAlias, setSelectedAliasState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initializationError, setInitializationError] = useState(null);
  const [isSwitchingGroup, setIsSwitchingGroup] = useState(false);

  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;

    const initialize = async () => {
      setIsLoading(true);
      try {
        const registryResponse = await fetch('/api/registry');
        if (!registryResponse.ok) {
          throw new Error('Failed to load network registry');
        }
        const registryPayload = await registryResponse.json();
        if (!registryPayload.success || !registryPayload.registry) {
          throw new Error(registryPayload.error || 'Network registry unavailable');
        }
        setRegistry(registryPayload.registry);

        let resolvedGroup = 'testnet';
        try {
          const envResponse = await fetch('/api/network/env', { credentials: 'include' });
          if (envResponse.ok) {
            const envData = await envResponse.json();
            resolvedGroup = envData?.env === 'mainnet' ? 'mainnet' : 'testnet';
          }
        } catch (envError) {
          logger.warn('Unable to fetch network env:', envError);
        }
        setNetworkGroup(resolvedGroup);

        let resolvedAlias = getFallbackAlias(registryPayload.registry, resolvedGroup);
        try {
          const aliasResponse = await fetch(`/api/network/default?group=${resolvedGroup}`);
          if (aliasResponse.ok) {
            const aliasData = await aliasResponse.json();
            if (aliasData?.alias) {
              resolvedAlias = aliasData.alias;
            }
          }
        } catch (aliasError) {
          logger.warn('Unable to fetch default alias:', aliasError);
        }

        setDefaultAlias(resolvedAlias);
        setSelectedAliasState(resolvedAlias);
      } catch (error) {
        logger.error('Network initialization error:', error);
        setInitializationError(error.message || 'Unable to load network configuration');
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  useEffect(() => {
    if (!registry || !networkGroup) {
      return;
    }
    if (!selectedAlias || !registry[selectedAlias] || registry[selectedAlias].group !== networkGroup) {
      const fallbackAlias = getFallbackAlias(registry, networkGroup);
      if (fallbackAlias) {
        setSelectedAliasState(fallbackAlias);
        if (!defaultAlias) {
          setDefaultAlias(fallbackAlias);
        }
      } else {
        setSelectedAliasState(null);
      }
    }
  }, [defaultAlias, networkGroup, registry, selectedAlias]);

  const supportedNetworks = useMemo(() => {
    if (!registry || !networkGroup) {
      return [];
    }
    return Object.entries(registry)
      .filter(([, config]) => config.group === networkGroup)
      .map(([alias, config]) => ({ alias, ...config }));
  }, [registry, networkGroup]);

  const currentNetwork = useMemo(() => {
    if (!registry || !selectedAlias) {
      return null;
    }
    return registry[selectedAlias] || null;
  }, [registry, selectedAlias]);

  const setSelectedAlias = useCallback(
    (nextAlias) => {
      if (!registry || !nextAlias || !registry[nextAlias]) {
        return;
      }
      setSelectedAliasState((prev) => (prev === nextAlias ? prev : nextAlias));
    },
    [registry]
  );

  const switchNetworkGroup = useCallback(
    async (targetGroup) => {
      if (!targetGroup || targetGroup === networkGroup) {
        return;
      }

      setIsSwitchingGroup(true);
      try {
        const res = await fetch('/api/network/env', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ env: targetGroup })
        });

        if (!res.ok) {
          let details = {};
          try {
            details = await res.json();
          } catch (jsonError) {
            // ignore
          }

          const fallbackMessage =
            targetGroup === 'mainnet'
              ? 'Mainnet is not available yet. Please stay on Testnet for now.'
              : `Cannot switch to ${targetGroup}`;

          const errorMessage =
            typeof details.error === 'string'
              ? details.error
              : fallbackMessage;

          const friendlyMessage =
            targetGroup === 'mainnet' &&
            /default mainnet alias|BLOCKCHAIN_DEFAULT_MAINNET_ALIAS/i.test(errorMessage)
              ? 'Mainnet is not configured yet. We will enable it soon.'
              : errorMessage || fallbackMessage;

          throw new Error(friendlyMessage);
        }

        setNetworkGroup(targetGroup);

        let nextAlias = getFallbackAlias(registry, targetGroup);
        try {
          const aliasResponse = await fetch(`/api/network/default?group=${targetGroup}`);
          if (aliasResponse.ok) {
            const aliasData = await aliasResponse.json();
            if (aliasData?.alias) {
              nextAlias = aliasData.alias;
            }
          }
        } catch (aliasError) {
          logger.warn('Unable to fetch default alias:', aliasError);
        }

        setDefaultAlias(nextAlias);
        setSelectedAliasState(nextAlias);

        return nextAlias;
      } finally {
        setIsSwitchingGroup(false);
      }
    },
    [networkGroup, registry]
  );

  const value = useMemo(
    () => ({
      registry,
      networkGroup,
      defaultAlias,
      selectedAlias,
      currentNetwork,
      supportedNetworks,
      isLoading,
      initializationError,
      isSwitchingGroup,
      setSelectedAlias,
      switchNetworkGroup
    }),
    [
      currentNetwork,
      defaultAlias,
      initializationError,
      isLoading,
      isSwitchingGroup,
      networkGroup,
      registry,
      selectedAlias,
      setSelectedAlias,
      supportedNetworks,
      switchNetworkGroup
    ]
  );

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}


