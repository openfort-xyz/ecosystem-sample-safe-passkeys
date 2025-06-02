import React, { ComponentType, useEffect, FC } from "react";
import {
  Store,
  WithAuthenticationRequiredOptions,
} from "@openfort/ecosystem-js/react";
import { useAccount } from "wagmi";
import { useRapidsafe } from "./RapidsafeContext";

/**
 * @ignore
 */
// eslint-disable-next-line react/jsx-no-useless-fragment
const defaultOnRedirecting = (): JSX.Element => <></>;

/**
 * @ignore
 */
const defaultReturnTo = (): string =>
  `${window.location.pathname}${window.location.search}${window.location.hash}`;

/**
 * ```js
 * const MyProtectedComponent = withAuthenticationRequired(MyComponent);
 * ```
 *
 * When you wrap your components in this Higher Order Component and an anonymous user visits your component
 * they will be redirected to the login page; after login they will be returned to the page they were redirected from.
 */
export const withAuthenticationRequired = <P extends object>(
  Component: ComponentType<P>,
  options: WithAuthenticationRequiredOptions = {}
): FC<P> =>
  function WithAuthenticationRequired(props: P): JSX.Element {
    const {
      returnTo = defaultReturnTo,
      onRedirecting = defaultOnRedirecting,
      loginOptions,
    } = options;
    const { address, status } = useAccount();

    const { navigateTo } = useRapidsafe();
    const mode = Store.useStore((state) => state.mode);

    useEffect(() => {
      if (address || !mode) {
        return;
      }

      if (window.location.pathname === "/sign/eth-request-accounts") {
        console.log(
          "withAuthenticationRequired - Already on eth-request-accounts page, skipping redirect"
        );
        return;
      }

      const returnToParam =
        typeof returnTo === "function" ? returnTo() : returnTo;
      console.log(
        "withAuthenticationRequired - Return to param:",
        returnToParam
      );

      const opts = {
        ...loginOptions,
        appState: {
          ...loginOptions,
          returnTo: returnToParam,
        },
      };

      (async (): Promise<void> => {
        if (mode === "iframe") {
          console.log("withAuthenticationRequired - Navigating in iframe mode");
          navigateTo({ returnTo: "/sign/eth-request-accounts", ...opts });
        }
        if (mode === "popup") {
          console.log("withAuthenticationRequired - Navigating in popup mode");
          navigateTo({ returnTo: "/sign/eth-request-accounts", ...opts });
        }
      })();
    }, [mode, loginOptions, returnTo]);

    // If we have a user, render the component
    return address ? <Component {...props} /> : onRedirecting();
  };
