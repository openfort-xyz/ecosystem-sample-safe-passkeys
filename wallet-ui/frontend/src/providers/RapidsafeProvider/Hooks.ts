import { useMemo } from 'react';
import type * as RpcSchema from 'ox/RpcSchema';

import { decodeRequestURLParams, MessageID } from './internal/encoding';

interface SearchResult<T extends RpcSchema.ExtractMethodName<RpcSchema.Default>> {
  params: RpcSchema.ExtractParams<RpcSchema.Default, T>;
  id: MessageID;
  chainId: number;
  method: T;
  callbackUrl?: string;
  sender: string;
  requestId: MessageID;
}

export const useSearch = <T extends RpcSchema.ExtractMethodName<RpcSchema.Default>>(): SearchResult<T> => {
  const value = useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        params: undefined,
        policy: undefined,
      };
    }
    const searchParams = new URLSearchParams(window.location.search);
    const decodedUrlParams = decodeRequestURLParams(searchParams);
    return {
      params: decodedUrlParams.params,
      chainId: decodedUrlParams.chainId,
      method: decodedUrlParams.method,
      id: decodedUrlParams.id,
      sender: decodedUrlParams.sender,
      callbackUrl: decodedUrlParams.callbackUrl,
      requestId: decodedUrlParams.requestId,
    };
  }, [window.location.search]) as SearchResult<T>;

  return value;
};
