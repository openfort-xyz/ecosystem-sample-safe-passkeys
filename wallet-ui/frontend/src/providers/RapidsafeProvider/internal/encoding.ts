import type * as RpcSchema from 'ox/RpcSchema';
import { UUID } from 'crypto';

export type MessageID = UUID;

export interface RPCMessage {
  id: MessageID;
  chainId?: number;
  requestId?: MessageID;
  sender?: string;
  callbackUrl?: string;
}

export interface RPCRequestMessage extends RPCMessage {
  method: RpcSchema.ExtractMethodName<RpcSchema.Default>;
  params?: RpcSchema.ExtractParams<RpcSchema.Default>;
}

export function decodeRequestURLParams(params: URLSearchParams): Partial<RPCRequestMessage> {
  const parseParam = <T>(paramName: string): T | undefined => {
    const encodedValue = params.get(paramName);
    if (!encodedValue) return undefined;
    try {
      return JSON.parse(encodedValue) as T;
    } catch {
      return undefined;
    }
  };

  return {
    id: parseParam<MessageID>('id'),
    sender: parseParam<string>('sender'),
    chainId: parseParam<number>('chainId'),
    method: parseParam<RpcSchema.ExtractMethodName<RpcSchema.Default>>('method'),
    params: parseParam<RpcSchema.ExtractParams<RpcSchema.Default>>('params'),
    callbackUrl: parseParam<string>('callbackUrl'),
    requestId: parseParam<MessageID>('requestId'),
  };
}

export function encodeResponseURLParams(request: RPCRequestMessage) {
  const urlParams = new URLSearchParams();
  const appendParam = (key: string, value: unknown) => {
    if (value) urlParams.append(key, JSON.stringify(value));
  };

  appendParam('id', request.id);
  appendParam('sender', request.sender);
  if (request.callbackUrl) appendParam('callbackUrl', request.callbackUrl);
  appendParam('requestId', request.requestId);
  appendParam('params', request.params);
  appendParam('chainId', request.chainId);
  appendParam('method', request.method);

  return urlParams.toString();
}
