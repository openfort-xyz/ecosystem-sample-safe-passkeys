"use client";

import { Button } from "../ui/button";
import { useAccount, useChainId, useConnect, useDisconnect } from "wagmi";
import { useCallback, useEffect, useState } from "react";
import { ecosystemWalletInstance } from "@/app/utils/rapidsafe";
import { LogOut, Copy, Check } from "lucide-react";
import { Card } from "../ui/card";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { truncateAddress } from "@/lib/wallet";

export function WalletConnect() {
  const [copied, setCopied] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<'wagmi' | 'rainbowkit'>('wagmi');
  
  useEffect(() => {
    ecosystemWalletInstance.getEthereumProvider({
      policy: process.env.NEXT_PUBLIC_POLICY_ID,
    });
  }, []);
  
  const { address, isConnected, connector, chain } = useAccount();
  const { connectors, connect, error } = useConnect();
  const { disconnect } = useDisconnect();

  const connectWallet = useCallback(() => {
    const injectedConnector = connectors.find(
      (connector) => connector.id === 'xyz.openfort.rapidsafe'
    );
    if (injectedConnector) {
      connect({ connector: injectedConnector });
    }
  }, [connectors, connect]);
  
  const handleDisconnectWallet = useCallback(async() => {
    disconnect();
    const provider = await connector?.getProvider();
    (provider as any).disconnect(); // this is needed because wagmi isn't calling the providers disconnect method
  }, [disconnect, connector]);

  const copyToClipboard = useCallback(() => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [address]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center w-full space-y-2">
        <h3 className="inline-block text-muted-foreground text-xs font-medium bg-transparent/50 rounded-full p-2">
          Select your provider
        </h3>
        <p className="text-muted-foreground font-medium text-sm md:text-base text-center">
          {`Preview how it integrates with your existing wallet connectors.`}
        </p>
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <div className="flex gap-2 w-full">
        <Button
          variant="outline"
          className={`flex-1 font-medium justify-start rounded-full ${selectedWallet === 'wagmi' ? 'bg-muted/50 border-border' : ''}`}
          onClick={() => setSelectedWallet('wagmi')}
        >
          <WagmiLogo />
          Wagmi
        </Button>
        <Button 
          variant="outline"
          className={`flex-1 justify-start rounded-full ${selectedWallet === 'rainbowkit' ? 'bg-muted/50 border-border' : ''}`}
          onClick={() => setSelectedWallet('rainbowkit')}
        >
          <RainbowLogo />
          RainbowKit
        </Button>
          </div>
          {selectedWallet === 'wagmi' ? (
        <div className='flex justify-center w-full'>
          <Button
            onClick={connectWallet}
            className="inline-flex font-bold items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-sm px-6 py-5"
          >
            Continue with RapidSafe
          </Button>
        </div>
          ) : (
        <div className="w-full flex justify-center">
          <ConnectButton />
        </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md p-6 border-green-900 bg-green">
      {address && (
        <div className="flex gap-3 items-center">
          <Button
            variant="outline"
            onClick={copyToClipboard}
            className="w-full font-mono text-sm text-muted-foreground break-all px-3 py-2 rounded-lg flex justify-between items-center bg-muted/20 hover:bg-muted/30 h-auto"
          >
            <a
            href={chain?.blockExplorers?.default.url + '/address/' + address}
            target="_blank"
            rel="noopener noreferrer"
            className=" truncate text-primary hover:text-primary/80 hover:underline cursor-pointer text-sm"
            >
              {truncateAddress(address)}
            </a>
            {copied ? (
              <Check className="w-4 h-4 text-green-500 flex-shrink-0 ml-2" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleDisconnectWallet}
            className="flex items-center justify-center gap-2 rounded-lg"
            size="sm"
          >
            <LogOut className="w-3 h-3" /> Log out
          </Button>

        </div>
      )}
      
    </Card>
  );
}


function WagmiLogo() {
  return (
    <svg
      aria-hidden="true"
      className="text-[#1B1B1B] dark:text-white w-6 mr-2"
      fill="none"
      height="auto"
      viewBox="0 0 24 11"
      width="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        clipRule="evenodd"
        d="M2.67052 6.6763C2.67052 7.41374 3.26834 8.01156 4.00578 8.01156H6.6763C7.41374 8.01156 8.01156 7.41374 8.01156 6.6763L8.01156 1.33526C8.01156 0.597817 8.60938 0 9.34682 0C10.0843 0 10.6821 0.597816 10.6821 1.33526V6.6763C10.6821 7.41374 11.2799 8.01156 12.0173 8.01156H14.6879C15.4253 8.01156 16.0231 7.41374 16.0231 6.6763V1.33526C16.0231 0.597816 16.6209 0 17.3584 0C18.0958 0 18.6936 0.597817 18.6936 1.33526V9.34682C18.6936 10.0843 18.0958 10.6821 17.3584 10.6821H1.33526C0.597816 10.6821 0 10.0843 0 9.34682L4.76837e-07 1.33526C5.21541e-07 0.597817 0.597817 0 1.33526 0C2.0727 0 2.67052 0.597816 2.67052 1.33526L2.67052 6.6763ZM21.6185 11C22.6018 11 23.3988 10.2029 23.3988 9.21965C23.3988 8.23639 22.6018 7.43931 21.6185 7.43931C20.6352 7.43931 19.8382 8.23639 19.8382 9.21965C19.8382 10.2029 20.6352 11 21.6185 11Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  )
}

function RainbowLogo() {
  return (
    <svg
      aria-hidden="true"
      className="rounded-sm w-6 mr-2"
      fill="none"
      height="auto"
      viewBox="0 0 120 120"
      width="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M120 0H0V120H120V0Z" fill="url(#paint0_linear_681_14)" />
      <path
        d="M20 38H26C56.9279 38 82 63.0721 82 94V100H94C97.3137 100 100 97.3137 100 94C100 53.1309 66.8691 20 26 20C22.6863 20 20 22.6863 20 26V38Z"
        fill="url(#paint1_radial_681_14)"
      />
      <path
        d="M84 94H100C100 97.3137 97.3137 100 94 100H84V94Z"
        fill="url(#paint2_linear_681_14)"
      />
      <path
        d="M26 20V36H20V26C20 22.6863 22.6863 20 26 20Z"
        fill="url(#paint3_linear_681_14)"
      />
      <path
        d="M20 36H26C58.0325 36 84 61.9675 84 94V100H66V94C66 71.9086 48.0914 54 26 54H20V36Z"
        fill="url(#paint4_radial_681_14)"
      />
      <path d="M68 94H84V100H68V94Z" fill="url(#paint5_linear_681_14)" />
      <path d="M20 52V36H26V52H20Z" fill="url(#paint6_linear_681_14)" />
      <path
        d="M20 62C20 65.3137 22.6863 68 26 68C40.3594 68 52 79.6406 52 94C52 97.3137 54.6863 100 58 100H68V94C68 70.804 49.196 52 26 52H20V62Z"
        fill="url(#paint7_radial_681_14)"
      />
      <path
        d="M52 94H68V100H58C54.6863 100 52 97.3137 52 94Z"
        fill="url(#paint8_radial_681_14)"
      />
      <path
        d="M26 68C22.6863 68 20 65.3137 20 62V52H26V68Z"
        fill="url(#paint9_radial_681_14)"
      />
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="paint0_linear_681_14"
          x1="60"
          x2="60"
          y1="0"
          y2="120"
        >
          <stop stopColor="#174299" />
          <stop offset="1" stopColor="#001E59" />
        </linearGradient>
        <radialGradient
          cx="0"
          cy="0"
          gradientTransform="translate(26 94) rotate(-90) scale(74)"
          gradientUnits="userSpaceOnUse"
          id="paint1_radial_681_14"
          r="1"
        >
          <stop offset="0.770277" stopColor="#FF4000" />
          <stop offset="1" stopColor="#8754C9" />
        </radialGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="paint2_linear_681_14"
          x1="83"
          x2="100"
          y1="97"
          y2="97"
        >
          <stop stopColor="#FF4000" />
          <stop offset="1" stopColor="#8754C9" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="paint3_linear_681_14"
          x1="23"
          x2="23"
          y1="20"
          y2="37"
        >
          <stop stopColor="#8754C9" />
          <stop offset="1" stopColor="#FF4000" />
        </linearGradient>
        <radialGradient
          cx="0"
          cy="0"
          gradientTransform="translate(26 94) rotate(-90) scale(58)"
          gradientUnits="userSpaceOnUse"
          id="paint4_radial_681_14"
          r="1"
        >
          <stop offset="0.723929" stopColor="#FFF700" />
          <stop offset="1" stopColor="#FF9901" />
        </radialGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="paint5_linear_681_14"
          x1="68"
          x2="84"
          y1="97"
          y2="97"
        >
          <stop stopColor="#FFF700" />
          <stop offset="1" stopColor="#FF9901" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="paint6_linear_681_14"
          x1="23"
          x2="23"
          y1="52"
          y2="36"
        >
          <stop stopColor="#FFF700" />
          <stop offset="1" stopColor="#FF9901" />
        </linearGradient>
        <radialGradient
          cx="0"
          cy="0"
          gradientTransform="translate(26 94) rotate(-90) scale(42)"
          gradientUnits="userSpaceOnUse"
          id="paint7_radial_681_14"
          r="1"
        >
          <stop offset="0.59513" stopColor="#00AAFF" />
          <stop offset="1" stopColor="#01DA40" />
        </radialGradient>
        <radialGradient
          cx="0"
          cy="0"
          gradientTransform="translate(51 97) scale(17 45.3333)"
          gradientUnits="userSpaceOnUse"
          id="paint8_radial_681_14"
          r="1"
        >
          <stop stopColor="#00AAFF" />
          <stop offset="1" stopColor="#01DA40" />
        </radialGradient>
        <radialGradient
          cx="0"
          cy="0"
          gradientTransform="translate(23 69) rotate(-90) scale(17 322.37)"
          gradientUnits="userSpaceOnUse"
          id="paint9_radial_681_14"
          r="1"
        >
          <stop stopColor="#00AAFF" />
          <stop offset="1" stopColor="#01DA40" />
        </radialGradient>
      </defs>
    </svg>
  )
}
