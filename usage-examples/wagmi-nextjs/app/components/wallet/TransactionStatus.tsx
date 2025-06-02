"use client";

import { truncateHash } from "@/lib/wallet";

interface TransactionStatusProps {
  hash: string;
  status: 'pending' | 'success' | 'error';
  blockExplorerUrl: string;
}

export function TransactionStatus({ hash, status, blockExplorerUrl }: TransactionStatusProps) {
  const statusColors = {
    pending: 'text-yellow-600 bg-yellow-600/10',
    success: 'text-green-600 bg-green-600/10',
    error: 'text-red-600 bg-red-600/10'
  };

  return (
    <div className="mt-3 p-3 rounded-lg bg-muted/20">
      <div className="flex items-center justify-between">
        <a
          href={blockExplorerUrl + '/tx/' + hash}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary/80 hover:underline text-sm font-mono block truncate"
        >
          {truncateHash(hash)}
        </a>
        <span className={`text-xs px-2 font-medium py-1 rounded-md ${statusColors[status]}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>
    </div>
  );
}