import * as ox_Provider from 'ox/Provider'
import * as PersonalMessage from 'ox/PersonalMessage'
import * as Address from 'ox/Address'
import * as Hex from 'ox/Hex'
import { Config, Transport } from 'wagmi';
import {
    createClient,
    fallback,
    http,
    type PublicRpcSchema,
    type Account as viem_Account,
    type Client as viem_Client,
    type Transport as viem_Transport,
} from 'viem'
import { toHex, Chain } from 'viem';

import { Implementation } from './Implementation';


// Storage keys for consistent access
export const STORAGE_KEYS = {
    ACCOUNT_CHAIN_ID: 'webauthn_account_chain_id',
    ACCOUNT_ADDRESS: 'webauthn_account_address',
    CREDENTIAL: (address: string) => `webauthn_credential_${address}`
};

export type Client<chain extends Chain = Chain> = viem_Client<
    viem_Transport,
    chain,
    viem_Account | undefined,
    [...PublicRpcSchema]
>
const clientCache = new Map<string, Client<any>>()
export function getClient<
    chains extends readonly [Chain, ...Chain[]],
>(
    config: Config<chains>,
    parameters: { chainId?: number | undefined } = {},
): Client<chains[number]> {
    const id = 'xyz.openfort.rapidsafe'
    // @ts-ignore
    const { chains, transports } = config
    const storedChainId = localStorage.getItem(STORAGE_KEYS.ACCOUNT_CHAIN_ID);
    const chainId = parameters.chainId ?? Number(storedChainId)
    console.log('[EIP1193Provider] getClient chainId:', chains, 'chainId:', chainId)
    const chain = chains.find((chain) => chain.id === chainId)
    if (!chain) throw new Error('chain not found')

    const transport =
        (transports as Record<number, Transport>)[chain.id] ??
        fallback(chain.rpcUrls.default.http.map((url) => http(url)))
    if (!transport) throw new Error('transport not found')

    const key = [id, chainId].filter(Boolean).join(':')
    if (clientCache.has(key)) return clientCache.get(key)!
    const client = createClient({
        chain,
        pollingInterval: 1_000,
        transport: transport,
    })
    clientCache.set(key, client)
    return client
}


// Error codes for EIP-1193 compliance
enum ProviderErrorCode {
    UNAUTHORIZED = 4100,
    UNSUPPORTED_METHOD = 4200,
    USER_REJECTED_REQUEST = 4001,
    DISCONNECTED = 4900,
    CHAIN_DISCONNECTED = 4901,
}

// JSON-RPC request interface
interface JsonRpcRequest {
    method: string;
    params?: any[];
}

// Custom error class for JSON-RPC errors
class JsonRpcError extends Error {
    code: number;
    data?: any;

    constructor(code: number, message: string, data?: any) {
        super(message);
        this.code = code;
        this.data = data;
    }
}

// Configuration interface for the provider
export interface EIP1193ProviderConfig {
    rpId?: string; // WebAuthn relying party ID
    transports: Record<number, Transport>
    chains: readonly [Chain, ...Chain[]]
}
export type Provider = ox_Provider.Provider<{
    includeEvents: true
}>

export class EIP1193Provider {
    private eventEmitter: ReturnType<typeof ox_Provider.createEmitter>;
    public provider: Provider;
    private webAuthnImpl: Implementation | null = null;
    config: EIP1193ProviderConfig;

    constructor(config: EIP1193ProviderConfig) {
        console.log('[EIP1193Provider] constructor')
        this.eventEmitter = ox_Provider.createEmitter()
        this.config = config;

        // Initialize from localStorage
        this.initializeFromStorage();
        this.provider = ox_Provider.from({
            ...this.eventEmitter,
            request: this.request.bind(this),
        });
    }

    private getClient(chainId_?: Hex.Hex | number | undefined) {
        const chainId =
            typeof chainId_ === 'string' ? Hex.toNumber(chainId_) : chainId_
        // @ts-ignore
        return getClient(this.config, { chainId })
    }

    private async initializeFromStorage(): Promise<void> {
        try {
            const accountAddress = localStorage.getItem(STORAGE_KEYS.ACCOUNT_ADDRESS);
            console.log('[EIP1193Provider] initializeFromStorage Checking for stored account:', accountAddress);

            if (accountAddress) {
                // Check if the credential exists in localStorage
                const credentialJson = localStorage.getItem(STORAGE_KEYS.CREDENTIAL(accountAddress));
                if (!credentialJson) {
                    console.log('[EIP1193Provider] initializeFromStorage No credential found for account, removing');
                    localStorage.removeItem(STORAGE_KEYS.ACCOUNT_ADDRESS);
                    return;
                }
                const client = this.getClient()
                // Create the implementation with the stored address and the provider's transport options
                this.webAuthnImpl = new Implementation(
                    this.getClient(),
                    accountAddress as Address.Address,
                );

                // We only check for credential availability at this stage
                // The smartAccountClient will be initialized later when needed
                const hasCredential = this.webAuthnImpl.getCredentialId() !== null;

                if (hasCredential) {
                    // Emit accounts changed event to notify dApp
                    this.eventEmitter.emit('accountsChanged', [accountAddress as Address.Address]);

                    // Emit connect event to indicate provider is ready
                    const chain = client.chain
                    console.log('[EIP1193Provider] initializeFromStorage Successfully loaded account from storage', chain.id);
                    this.eventEmitter.emit('connect', { chainId: toHex(chain.id) });
                } else {
                    console.log('[EIP1193Provider] initializeFromStorage Credential not available, removing account');
                    localStorage.removeItem(STORAGE_KEYS.ACCOUNT_ADDRESS);
                    localStorage.removeItem(STORAGE_KEYS.ACCOUNT_CHAIN_ID);
                    localStorage.removeItem(STORAGE_KEYS.CREDENTIAL(accountAddress));
                    this.webAuthnImpl = null;
                }
            }
        } catch (error) {
            console.error('[EIP1193Provider] initializeFromStorage Error initializing from storage:', error);
            // We should be careful about clearing storage on errors
            // Only clear if it's clearly a corruption issue
            if (error instanceof SyntaxError) {
                const accountAddress = localStorage.getItem(STORAGE_KEYS.ACCOUNT_ADDRESS);
                if (accountAddress) {
                    localStorage.removeItem(STORAGE_KEYS.CREDENTIAL(accountAddress));
                }
                localStorage.removeItem(STORAGE_KEYS.ACCOUNT_ADDRESS);
                localStorage.removeItem(STORAGE_KEYS.ACCOUNT_CHAIN_ID);
                this.webAuthnImpl = null;
            }
        }
    }
    private async request(request: JsonRpcRequest): Promise<any> {
        try {
            console.log('[EIP1193Provider] Processing request:', request);

            // Simple methods that don't require full initialization
            if (request.method === 'eth_accounts') {
                // Return accounts if available, empty array if not
                if (this.webAuthnImpl && this.webAuthnImpl.getCredentialId() !== null) {
                    console.log('[EIP1193Provider] eth_accounts accounts', this.webAuthnImpl.address);
                    return [this.webAuthnImpl.address];
                }
                console.log('[EIP1193Provider] eth_accounts no accounts');
                return [];
            }

            if (request.method === 'eth_chainId') {
                const chainId = localStorage.getItem(STORAGE_KEYS.ACCOUNT_CHAIN_ID);
                const chainId_ = Hex.fromNumber(Number(chainId))
                console.log('[EIP1193Provider] eth_chainId chainId:', chainId, chainId_);
                return chainId_
            }

            // For eth_requestAccounts, we may need to create a new account or load an existing one
            if (request.method === 'eth_requestAccounts') {
                // Extract auth type from params if provided
                const params = request.params || [];
                const client = this.getClient()
                const authType = params[0]?.authType || 'signin'; // Default to sign-in
                console.log('[EIP1193Provider] eth_requestAccounts Auth type:', authType);

                // If we already have an initialized account with credential, return it
                if (this.webAuthnImpl && this.webAuthnImpl.getCredentialId() !== null) {
                    console.log('[EIP1193Provider] eth_requestAccounts Returning existing account');
                    return [this.webAuthnImpl.address];
                }

                // Try to sign in if authType is 'signin' or not specified
                if (authType === 'signin') {
                    console.log('[EIP1193Provider] eth_requestAccounts Attempting to load existing account');
                    try {
                        const impl = await Implementation.load({
                            getClient: (chainId_?: Hex.Hex | number | undefined) => this.getClient(chainId_),
                            rpId: this.config.rpId,
                        });

                        if (impl) {
                            this.webAuthnImpl = impl;
                            // Store the address in localStorage
                            localStorage.setItem(STORAGE_KEYS.ACCOUNT_ADDRESS, impl.address);
                            this.eventEmitter.emit('accountsChanged', [impl.address]);
                            const chain = client.chain;
                            console.log('[EIP1193Provider] eth_requestAccounts Successfully loaded account from storage', chain.id);
                            this.eventEmitter.emit('connect', { chainId: toHex(chain.id) });
                            return [impl.address];
                        } else if (authType === 'signin') {
                            throw new JsonRpcError(
                                ProviderErrorCode.UNAUTHORIZED,
                                'No existing account found. Please sign up first.'
                            );
                        }
                    } catch (error) {
                        console.error('[EIP1193Provider] eth_requestAccounts Error loading account:', error);
                        if (authType === 'signin') {
                            throw new JsonRpcError(
                                ProviderErrorCode.UNAUTHORIZED,
                                error instanceof Error ? error.message : 'Failed to load account'
                            );
                        }
                    }
                }

                // Sign up - create a new account
                if (authType === 'signup') {
                    console.log('[EIP1193Provider] eth_requestAccounts Creating new WebAuthn implementation');
                    try {
                        const label = params[0]?.label;
                        console.log('[EIP1193Provider] eth_requestAccounts Creating account with label:', label);

                        this.webAuthnImpl = await Implementation.create({
                            client: client,
                            label,
                        });

                        if (!this.webAuthnImpl.address) {
                            throw new JsonRpcError(
                                ProviderErrorCode.UNAUTHORIZED,
                                'Failed to create account'
                            );
                        }

                        // Store the address in localStorage
                        localStorage.setItem(STORAGE_KEYS.ACCOUNT_ADDRESS, this.webAuthnImpl.address);

                        // Emit events
                        this.eventEmitter.emit('accountsChanged', [this.webAuthnImpl.address]);
                        const chain = client.chain;
                        console.log('[EIP1193Provider] eth_requestAccounts Successfully created account', chain.id);
                        this.eventEmitter.emit('connect', { chainId: toHex(chain.id) });

                        return [this.webAuthnImpl.address];
                    } catch (error) {
                        console.error('[EIP1193Provider] eth_requestAccounts Error creating account:', error);
                        throw new JsonRpcError(
                            ProviderErrorCode.USER_REJECTED_REQUEST,
                            error instanceof Error ? error.message : 'Failed to create account'
                        );
                    }
                }

                throw new JsonRpcError(
                    ProviderErrorCode.UNAUTHORIZED,
                    'Failed to authenticate'
                );
            }

            // Now handle the specific methods
            switch (request.method) {
                case 'eth_sendTransaction': {
                    const calls = request.params?.map((param) => ({
                        chainId: param.chainId,
                        to: param.to as Address.Address,
                        value: param.value ? BigInt(param.value) : BigInt(0),
                        data: (param.data || '0x') as Hex.Hex,
                    })) || [];

                    try {
                        console.log('[EIP1193Provider] eth_sendTransaction calls:', calls);
                        return await this.webAuthnImpl!.execute(calls);
                    } catch (error) {
                        console.error('[EIP1193Provider] Transaction execution error:', error);
                        throw new JsonRpcError(
                            ProviderErrorCode.USER_REJECTED_REQUEST,
                            error instanceof Error ? error.message : 'Transaction failed'
                        );
                    }
                }

                case 'wallet_sendCalls': {
                    const calls = (request.params?.[0] as { calls: any[] }).calls.map((param) => ({
                        to: param.to as Address.Address,
                        value: param.value ? BigInt(param.value) : BigInt(0),
                        data: (param.data || '0x') as Hex.Hex,
                    })) || [];

                    try {
                        const paymasterUrl = request.params?.[0].capabilities?.url;
                        return await this.webAuthnImpl!.execute(calls, paymasterUrl);
                    } catch (error) {
                        console.error('[EIP1193Provider] Transaction execution error:', error);
                        throw new JsonRpcError(
                            ProviderErrorCode.USER_REJECTED_REQUEST,
                            error instanceof Error ? error.message : 'Transaction failed'
                        );
                    }
                }

                case 'eth_estimateGas': {
                    const calls = request.params?.map((param) => ({
                        to: param.to as Address.Address,
                        value: param.value ? BigInt(param.value) : BigInt(0),
                        data: (param.data || '0x') as Hex.Hex,
                    })) || [];
                    try {
                        console.log('[EIP1193Provider] eth_estimateGas calls:', calls);
                        return await this.webAuthnImpl!.estimateGas(calls);
                    } catch (error) {
                        console.error('[EIP1193Provider] Gas estimation error:', error);
                        throw new JsonRpcError(
                            ProviderErrorCode.USER_REJECTED_REQUEST,
                            error instanceof Error ? error.message : 'Gas estimation failed'
                        );
                    }
                }

                case 'personal_sign':
                    const params = request.params || [];
                    try {
                        return await this.webAuthnImpl!.signPersonalMessage(PersonalMessage.getSignPayload(params[0]));
                    } catch (error) {
                        console.error('[EIP1193Provider] Signing error:', error);
                        throw new JsonRpcError(
                            ProviderErrorCode.USER_REJECTED_REQUEST,
                            error instanceof Error ? error.message : 'Signing failed'
                        );
                    }

                case 'eth_signTypedData_v4':
                    try {
                        return await this.webAuthnImpl!.signTypedData(request.params?.[1]);
                    } catch (error) {
                        console.error('[EIP1193Provider] Typed data signing error:', error);
                        throw new JsonRpcError(
                            ProviderErrorCode.UNSUPPORTED_METHOD,
                            'Typed data signing not supported with this account'
                        );
                    }

                case 'wallet_grantPermissions': {
                    try {
                        return await this.webAuthnImpl!.grantPermissions(request.params || []);
                    } catch (error) {
                        console.error('[EIP1193Provider] wallet grant permissions error:', error);
                        throw new JsonRpcError(
                            ProviderErrorCode.UNSUPPORTED_METHOD,
                            'Permissions not supported with this account'
                        );
                    }
                }

                case 'wallet_switchEthereumChain': {
                    // Currently only supporting the configured chain
                    const targetChainId = request.params?.[0]?.chainId;
                    const client = this.getClient();
                    const numberChainId = Hex.toNumber(targetChainId)
                    console.log('[EIP1193Provider] wallet_switchEthereumChain targetChainId:', numberChainId, 'currentChainId:', client.chain.id);
                    if (targetChainId && numberChainId === client.chain.id) {
                        return null;
                    }
                    const chain = this.config.chains.find((chain) => chain.id === numberChainId);
                    if (chain) {
                        localStorage.setItem(STORAGE_KEYS.ACCOUNT_CHAIN_ID, String(numberChainId));
                        return null
                    }
                    throw new JsonRpcError(
                        ProviderErrorCode.CHAIN_DISCONNECTED,
                        `Chain with ID ${targetChainId} not supported`
                    );
                }

                case 'wallet_addEthereumChain':
                    // Reject adding new chains for now
                    throw new JsonRpcError(
                        ProviderErrorCode.UNSUPPORTED_METHOD,
                        'Adding new chains is not supported in this implementation'
                    );

                case 'wallet_getPermissions':
                    // Return basic permissions
                    return [
                        {
                            parentCapability: 'eth_accounts',
                            date: new Date().getTime(),
                        }
                    ];
                case 'wallet_disconnect': {
                    console.log('[EIP1193Provider] wallet_disconnect');
                    localStorage.removeItem(STORAGE_KEYS.ACCOUNT_ADDRESS);
                    localStorage.removeItem(STORAGE_KEYS.ACCOUNT_CHAIN_ID);
                    localStorage.removeItem(STORAGE_KEYS.CREDENTIAL(this.webAuthnImpl!.address));
                    this.eventEmitter.emit('disconnect', new ox_Provider.DisconnectedError())
                    // this.eventEmitter.emit('accountsChanged', []);
                    return
                }
                case 'wallet_requestPermissions':
                    // Only support eth_accounts permission for now
                    const requestedPermissions = request.params?.[0] || {};
                    if (requestedPermissions.eth_accounts) {
                        return this.request({ method: 'wallet_getPermissions' });
                    }
                    throw new JsonRpcError(
                        ProviderErrorCode.UNSUPPORTED_METHOD,
                        'Requested permission not supported'
                    );

                default:
                    throw new JsonRpcError(
                        ProviderErrorCode.UNSUPPORTED_METHOD,
                        `Method ${request.method} not supported`
                    );
            }
        } catch (error) {
            console.error('[EIP1193Provider] Error in request:', error);
            if (error instanceof JsonRpcError) {
                throw error;
            }
            throw new JsonRpcError(
                ProviderErrorCode.UNAUTHORIZED,
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }
}