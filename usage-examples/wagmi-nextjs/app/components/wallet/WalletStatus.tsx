"use client";

import { useAccount } from 'wagmi';
import { WalletActionCard } from "./WalletActionCard";
import { useWalletActions } from './WalletActions';

export function WalletStatus() {
  const { address } = useAccount();
  const { actions } = useWalletActions();

  if (!address) return null;

  // Define custom titles for each action
  const customTitles: Record<string, string> = {
    'eth_sendTransaction': 'Mint',
    'eth_signTypedData_v4': 'Typed signature',
    'personal_sign': 'Personal signature',
    'wallet_grantPermissions': 'Session key',
    'wallet_sendCalls': 'Batched transaction (Mint + transfer)',
  };

  // Define descriptions for each action
  const actionDescriptions: Record<string, string> = {
    'eth_sendTransaction': 'Mint 1 USDC to your account.',
    'eth_signTypedData_v4': 'Sign structured data with your wallet for secure verification.',
    'personal_sign': 'Sign a message with your wallet to prove your identity.',
    'wallet_grantPermissions': 'Grant permissions to sign 10 times on your behalf.',
    'wallet_sendCalls': 'Fund your account and complete a mint in one go.',

  };

  return (
    <div className="w-full">
      <div className="grid sm:grid-cols-3 grid-cols-1 gap-2">
        {actions.map((action) => (
          <div key={action.title}>
            <WalletActionCard
              {...action}
              customTitle={customTitles[action.title]}
              description={actionDescriptions[action.title]}
              isLoading={action.isLoading}
              onClick={action.onClick}
            />
          </div>
        ))}
      </div>
    </div>
  );
}