'use client';

import { Header } from "./components/layout/Header";
import { Footer } from "./components/layout/Footer";
import { WalletConnect } from "./components/wallet/WalletConnect";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "./utils/config";
import { InstallInstructions } from "./components/layout/InstallInstructions";
import { WalletStatus } from "./components/wallet/WalletStatus";
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

export default function Home() {
  return (
    <main className="relative min-h-screen bg-background text-foreground px-4 py-6 sm:p-8">
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider modalSize="compact">
            <div className="max-w-7xl mx-auto flex flex-col md:grid md:grid-cols-12 gap-6 md:gap-8">
              <div className="w-full md:col-span-4 flex flex-col space-y-6">
                <Header />

                <div className="space-y-6">
                  <InstallInstructions />
                  <WalletConnect />
                </div>

                <div className="mt-auto pt-6">
                  <Footer />
                </div>
              </div>

              <div className="w-full md:col-span-8 bg-muted/50 rounded-lg shadow-md overflow-hidden flex flex-col">
                <div className="p-4 md:p-6 flex flex-col items-center sm:items-start">
                  <div className="bg-slate-500 rounded-full mb-4 self-center sm:self-start">
                    <p className="text-sm text-foreground font-medium rounded-full px-4 py-1.5">
                      Your application
                    </p>
                  </div>
                  <WalletStatus />
                </div>
              </div>
            </div>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </main>
  );
}