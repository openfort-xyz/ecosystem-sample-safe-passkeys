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
  description = "This is a wallet action that interacts with the blockchain.",
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
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-blue-100 text-blue-500">
              <Icon className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">{displayTitle}</h3>
          </div>
          
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="rounded-full p-1 text-blue-400 hover:text-blue-600 hover:bg-blue-100">
                  <Info className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs bg-white border border-blue-100 shadow-md">
                <p className="text-xs text-gray-600">{description}</p>
                <p className="text-xs text-gray-500 mt-1">Call: {title}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
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
          
          <Button
            onClick={() => onClick(inputValue)}
            disabled={isLoading}
            className="w-full bg-black hover:bg-gray-800 text-white rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium py-5"
          >
            {isLoading ? 'Processing...' : buttonText}
          </Button>
          
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