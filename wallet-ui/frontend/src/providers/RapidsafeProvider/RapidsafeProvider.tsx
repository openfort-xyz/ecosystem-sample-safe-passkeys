import React, { useState, useEffect, useCallback, useMemo, PropsWithChildren, useRef } from "react";
import { AppState } from "@openfort/ecosystem-js/react";

import { RapidsafeContext, RapidsafeContextType } from "./RapidsafeContext";
import { setAuthType, setLabel } from "./Connector";
import { useSearch } from "./Hooks";
import { useAccount, useDisconnect, useSwitchChain } from "wagmi";
import { ChainId } from "@/lib/Wagmi";
import { STORAGE_KEYS } from "./EIP1193";
import { baseSepolia } from "viem/chains";

interface SafeProviderProps {
  children: React.ReactNode;
  debugMode?: boolean;
  onRedirectCallback?: (appState?: AppState) => void;
  rpId?: string; // Added for WebAuthn relying party ID
}

const defaultOnRedirectCallback = (appState?: AppState): void => {
  try {
    const currentSearch = window.location.search;
    const currentHash = window.location.hash;

    if (!appState?.returnTo) {
      // If no returnTo is specified, preserve current search and hash on the current path
      const newUrl = `${window.location.pathname}${currentSearch}${currentHash}`;
      window.history.replaceState({}, document.title, newUrl);
      return;
    }

    // Parse the returnTo URL
    const returnToUrl = new URL(appState.returnTo, window.location.origin);

    // Preserve existing search params from current URL if returnTo doesn't have them
    if (!returnToUrl.search && currentSearch) {
      returnToUrl.search = currentSearch;
    }

    // Preserve existing hash from current URL if returnTo doesn't have it
    if (!returnToUrl.hash && currentHash) {
      returnToUrl.hash = currentHash;
    }

    window.history.replaceState(
      {},
      document.title,
      returnToUrl.pathname + returnToUrl.search + returnToUrl.hash,
    );
  } catch (error) {
    console.error('[defaultOnRedirectCallback] Error:', error);
  }
};

const ensureUrlParamsPreserved =
  (callback: (appState?: AppState) => void) =>
  (appState?: AppState): void => {
    try {
      const currentSearch = window.location.search;
      const currentHash = window.location.hash;

      if (!appState?.returnTo) {
        callback(appState);
        return;
      }

      // Preserve URL parameters and hash in the returnTo URL
      const returnToUrl = new URL(appState.returnTo, window.location.origin);

      // Preserve existing search params from current URL if returnTo doesn't have them
      if (!returnToUrl.search && currentSearch) {
        returnToUrl.search = currentSearch;
      }

      // Preserve existing hash from current URL if returnTo doesn't have it
      if (!returnToUrl.hash && currentHash) {
        returnToUrl.hash = currentHash;
      }

      // Update appState with the modified returnTo URL
      const modifiedAppState = {
        ...appState,
        returnTo: returnToUrl.pathname + returnToUrl.search + returnToUrl.hash,
      };

      callback(modifiedAppState);
    } catch (error) {
      console.error("[ensureUrlParamsPreserved] Error:", error);
    }
  };

export const RapidsafeProvider: React.FC<PropsWithChildren<SafeProviderProps>> = ({
  children,
  debugMode,
  onRedirectCallback = defaultOnRedirectCallback,
  rpId,
}) => {
  const log = debugMode ? console.log : () => {};

  const searchParams = useSearch();
  const [history, setHistory] = useState<string[]>([]);
  const [isSignupFlow, setIsSignupFlow] = useState<boolean>(false);
  const isMounted = useRef(false);

  const { switchChainAsync } = useSwitchChain();
  const { disconnectAsync } = useDisconnect();
  const {chainId} = useAccount();

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    log('[RapidsafeProvider] chainId', chainId, searchParams.chainId);
    if (chainId && searchParams.chainId && chainId !== searchParams.chainId) {
      log('[RapidsafeProvider] switchChain', searchParams.chainId);
      switchChainAsync({
        chainId: searchParams.chainId as ChainId,
      }).catch((error: Error) => {
        log(error);
      });
    }
  }, [chainId, searchParams.chainId]);

  // Function to initiate the signup flow
  const initiateSignup = useCallback(async() => {
    setIsSignupFlow(true);
    setAuthType('signup');
    await disconnectAsync()
    const appChainIds = (searchParams?.params as unknown as {appChainIds:number[]})?.appChainIds ?? [baseSepolia.id];
    localStorage.setItem(STORAGE_KEYS.ACCOUNT_CHAIN_ID, String(appChainIds[0]));
    log('[RapidsafeProvider] Signup flow initiated');
  }, [log, searchParams.params]);

  // Function to initiate the signin flow
  const initiateSignin = useCallback(async() => {
    setIsSignupFlow(false);
    setAuthType('signin');
    const appChainIds = (searchParams?.params as unknown as {appChainIds:number[]})?.appChainIds ?? [baseSepolia.id];
    localStorage.setItem(STORAGE_KEYS.ACCOUNT_CHAIN_ID, String(appChainIds[0]));
    log('[RapidsafeProvider] Signin flow initiated');
  }, [log, searchParams.params]);

  // New function to set the account label
  const setAccountLabel = useCallback((label: string) => {
    setLabel(label);
    log('[RapidsafeProvider] Account label set:', label);
  }, [log]);

  const wrappedOnRedirectCallback = useMemo(
    () =>
      ensureUrlParamsPreserved((appState?: AppState) => {
        log("[RapidsafeProvider] Redirect callback called with appState:", appState);
        (onRedirectCallback as (appState?: AppState) => void)(appState);
      }),
    [onRedirectCallback, log]
  );

  const navigateTo = useCallback(
    (appState?: AppState) => {
      try {
        log("[navigateTo] Starting navigation with appState:", appState);
        log("[navigateTo] Current history:", history);

        if (appState === undefined && history.length > 0) {
          const previousPath = history[0];
          log("[navigateTo] No appState, navigating back to:", previousPath);
          wrappedOnRedirectCallback({ returnTo: previousPath });
          setHistory((prevHistory) => prevHistory.slice(0, 1));
        } else if (appState && "returnTo" in appState) {
          log("[navigateTo] Navigating to returnTo path:", appState.returnTo);
          setHistory((prevHistory) => [
            ...prevHistory,
            window.location.pathname,
          ]);
          wrappedOnRedirectCallback(appState);
        }

        log("[navigateTo] Navigation completed");
      } catch (error) {
        log("[navigateTo] Error during navigation:", error);
      }
    },
    [history, wrappedOnRedirectCallback, log]
  );

  // Enhanced context with signup, signin, and label setting
  const contextValue: RapidsafeContextType = {
    navigateTo,
    initiateSignup,
    initiateSignin,
    isSignupFlow,
    setAccountLabel,
  };

  return (
    <RapidsafeContext.Provider value={contextValue}>{children}</RapidsafeContext.Provider>
  );
};