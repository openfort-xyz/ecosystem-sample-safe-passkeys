import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner'

import * as Wagmi from './lib/Wagmi';
import * as Query from './lib/Query'
import { EcosystemProvider } from '@openfort/ecosystem-js/react';
import { RapidsafeProvider } from './providers';

const ProvidersWrapper = ({ children }: { children: React.ReactNode }) => {
  const nav = useNavigate();
  
  return (
    <WagmiProvider config={Wagmi.config}>
      <QueryClientProvider 
        client={Query.client}
      >
        <EcosystemProvider
          disableTransactionSimulation={false}
          appName='RapidSafe'
          navigateTo={(appState) => {
            nav({
              pathname: appState?.to,
              search: appState?.search
            })
          }}
          theme='retro'
          logoUrl='https://purple-magnificent-bat-958.mypinata.cloud/ipfs/QmfQrh2BiCzugFauYF9Weu9SFddsVh9qV82uw43cxH8UDV'
        >
          <Toaster
            className="z-[42069] select-none"
            expand={false}
            position="bottom-right"
            swipeDirections={['right', 'left', 'top', 'bottom']}
            theme="light"
            toastOptions={{
              style: {
                borderRadius: '1.5rem',
              },
            }}
          />
          <RapidsafeProvider
            debugMode={true}
            onRedirectCallback={(appState) => {
              return nav(appState?.returnTo || window.location.pathname);
            }}
            >
            {children}
          </RapidsafeProvider>
        </EcosystemProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ProvidersWrapper>
        <App />
      </ProvidersWrapper>
    </BrowserRouter>
  </React.StrictMode>
);