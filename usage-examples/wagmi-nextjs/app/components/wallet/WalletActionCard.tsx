"use client";

import { BaseError } from 'wagmi';
import { Button } from '../ui/button';
import { Card } from '../ui/card'; 
import { TransactionStatus } from "./TransactionStatus";
import { LucideIcon, Info } from 'lucide-react';
import { Input } from '../ui/input';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface WalletActionCardProps {
  icon: LucideIcon;
  title: string;
  buttonText: string;
  blockExplorerUrl: string;
  isLoading?: boolean;
  error?: Error | null;
  hash?: `0x${string}`;
  payload?: string;
  input?: boolean;
  isConfirming?: boolean;
  isConfirmed?: boolean;
  onClick: (id?: string) => void;
  description?: string;
  customTitle?: string;
}

export function WalletActionCard({
  icon: Icon,
  title,
  buttonText,
  isLoading,
  blockExplorerUrl,
  error,
  hash,
  isConfirming,
  input,
  payload,
  isConfirmed,
  onClick,
  description = "This is a wallet action to SIWE",
  customTitle
}: WalletActionCardProps) {
  const [inputValue, setInputValue] = useState('');
  
  let status: 'pending' | 'success' | 'error' = 'pending';
  if (isConfirmed) status = 'success';
  if (error) status = 'error';

  // Use custom title if provided, otherwise generate a friendly title from the API name
  const displayTitle = customTitle || (title.includes('_') 
    ? title.split('_').slice(1).join(' ').replace(/([A-Z])/g, ' $1').trim()
    : title);

  return (
    <Card className="p-4 bg-blue-50 border border-blue-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col h-full">
        <Button
          onClick={() => onClick(inputValue)}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-800 text-white rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium py-5 mb-2"
        >
          <Icon className="w-4 h-4" />
          {isLoading ? 'Processing...' : buttonText}
        </Button>
        <div className="text-xs text-gray-500 mb-4 text-center">{description}</div>
        <div className="mt-auto space-y-3">
          {input && (
            <div className="space-y-1.5">
              <label className="text-xs text-gray-600">Amount</label>
              <div className="flex items-center gap-2">
                <Input 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="0x.."
                  className="border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-500 text-sm"
                />
              </div>
            </div>
          )}
          {error && (
            <p className="text-xs text-red-500">
              {(error as BaseError).details || error.message}
            </p>
          )}
          {hash && (
            <TransactionStatus 
              hash={hash}
              blockExplorerUrl={blockExplorerUrl}
              status={status}
            />
          )}
          {payload && (
            <div className="mt-2">
              <div className="text-nowrap overflow-x-auto text-xs text-gray-600 p-2 bg-blue-50 rounded-lg border border-blue-100">
                {payload}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}