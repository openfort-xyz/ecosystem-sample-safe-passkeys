import { createConnector } from 'wagmi';
import {
    type Connector,
    type Transport,
} from '@wagmi/core'
import {
    Address,
    RpcError,
    withRetry,
} from 'viem'
import {
    UserRejectedRequestError,
    SwitchChainError,
    numberToHex,
    getAddress,
} from 'viem';
import {
    ChainNotConfiguredError,
} from '@wagmi/core'
import { EIP1193Provider, Provider } from './EIP1193';

export type RapidsafeParameters = {
    /**
     * Label to use for the account during signup
     */
    label?: string;

    /**
     * WebAuthn relying party ID
     */
    rpId?: string;

    /**
     * Appearance configuration for the wallet
     */
    appearanceConfiguration?: {
        name: string;
        icon: null | string;
        reverseDomainNameSystem: string;
    };
};

type AuthType = 'signin' | 'signup';

// Create a simple store for tracking the current auth type
const authTypeStore = {
    current: 'signin' as AuthType,
    set(type: AuthType) {
        this.current = type;
    },
    get() {
        return this.current;
    }
};

// Create a simple store for tracking the current label
const labelStore = {
    current: '' as string,
    set(label: string) {
        this.current = label;
    },
    get() {
        return this.current;
    }
};

// Export setter for components to use
export const setAuthType = (type: AuthType) => {
    authTypeStore.set(type);
};

// Export setter for label
export const setLabel = (label: string) => {
    labelStore.set(label);
};

export function rapidsafe(config: RapidsafeParameters = {}) {
    return createConnector((wagmiConfig) => {
        const chains = wagmiConfig.chains ?? []
        const transports = (() => {
            return Object.entries(wagmiConfig.transports ?? {}).reduce(
                (transports, [chainId, transport]) => ({
                    // biome-ignore lint/performance/noAccumulatingSpread:
                    ...transports,
                    [chainId]: 'default' in transport ? transport.default : transport,
                }),
                {} as Record<number, Transport>,
            )
        })()

        let accountsChanged: Connector['onAccountsChanged'] | undefined
        let chainChanged: Connector['onChainChanged'] | undefined
        let connect: Connector['onConnect'] | undefined
        let disconnect: Connector['onDisconnect'] | undefined

        return {
            async connect({ chainId, isReconnecting, ...rest } = {}) {
                console.log('[CustomSafeConnector] connect:', rest, 'chainId:', chainId, 'isReconnecting:', isReconnecting);
                let accounts: readonly Address[] = []
                if (isReconnecting) accounts = await this.getAccounts().catch(() => [])
                const provider = await this.getProvider()
                try {
                    console.log('[CustomSafeConnector] connect - provider:', accounts, !isReconnecting);
                    if (!accounts?.length && !isReconnecting) {
                        const currentLabel = labelStore.get() || config.label;
                        const res = await provider.request({
                            method: 'eth_requestAccounts',
                            // @ts-ignore
                            params: [{
                                authType: authTypeStore.get(),
                                label: currentLabel
                            }]
                        })
                        accounts = (res as Address[]).map((x) => getAddress(x))
                    }

                    // Manage EIP-1193 event listeners
                    // https://eips.ethereum.org/EIPS/eip-1193#events
                    if (connect) {
                        provider.removeListener('connect', connect)
                        connect = undefined
                    }
                    if (!accountsChanged) {
                        accountsChanged = this.onAccountsChanged.bind(this)
                        // Provider uses Ox, which uses `readonly Address.Address[]` for `accountsChanged`,
                        // while Connector `accountsChanged` is `string[]`
                        provider.on('accountsChanged', accountsChanged as never)
                    }
                    if (!chainChanged) {
                        chainChanged = this.onChainChanged.bind(this)
                        provider.on('chainChanged', chainChanged)
                    }
                    if (!disconnect) {
                        disconnect = this.onDisconnect.bind(this)
                        provider.on('disconnect', disconnect)
                    }

                    // Switch to chain if provided
                    let currentChainId = await this.getChainId()
                    if (chainId && currentChainId !== chainId) {
                        const chain = await this.switchChain!({ chainId }).catch(
                            (error) => {
                                if (error.code === UserRejectedRequestError.code) throw error
                                return { id: currentChainId }
                            },
                        )
                        currentChainId = chain?.id ?? currentChainId
                    }

                    return { accounts, chainId: currentChainId }
                } catch (err) {
                    const error = err as RpcError
                    if (error.code === UserRejectedRequestError.code)
                        throw new UserRejectedRequestError(error)
                    throw error
                }
            },
            async disconnect() {
                console.log('[CustomSafeConnector] disconnect called');
                const provider = await this.getProvider()

                if (chainChanged) {
                    provider.removeListener('chainChanged', chainChanged)
                    chainChanged = undefined
                }
                if (disconnect) {
                    provider.removeListener('disconnect', disconnect)
                    disconnect = undefined
                }
                if (!connect) {
                    connect = this.onConnect.bind(this)
                    provider.on('connect', connect)
                }

                await provider.request({ method: 'wallet_disconnect' })
            },
            async getProvider() {
                const provider = new EIP1193Provider({
                    chains,
                    transports,
                    rpId: config.rpId,
                });
                return provider.provider;
            },
            async getAccounts() {
                const provider: Provider = await this.getProvider();
                const accounts = await provider.request({
                    method: 'eth_accounts',
                })
                return accounts.map((x) => getAddress(x))
            },
            async getChainId() {
                const provider: Provider = await this.getProvider();
                const hexChainId = await provider.request({
                    method: 'eth_chainId',
                })
                return Number(hexChainId)
            },
            async isAuthorized() {
                try {
                    // Use retry strategy as some injected wallets (e.g. MetaMask) fail to
                    // immediately resolve JSON-RPC requests on page load.
                    const accounts = await withRetry(() => this.getAccounts())
                    return !!accounts.length
                } catch {
                    return false
                }
            },
            async switchChain({ chainId }) {
                console.log('[CustomSafeConnector] switchChain called with chainId:', chainId);
                const chain = chains.find((chain) => chain.id === chainId);
                if (!chain) throw new SwitchChainError(new ChainNotConfiguredError());
                const provider = await this.getProvider();

                await provider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: numberToHex(chain.id) }],
                });
                console.log('[CustomSafeConnector] switchChain success:', chain.id);

                return chain;

            },
            async onAccountsChanged(accounts) {
                wagmiConfig.emitter.emit('change', {
                    accounts: accounts.map((x) => getAddress(x)),
                })
            },
            onChainChanged(chain) {
                const chainId = Number(chain)
                wagmiConfig.emitter.emit('change', { chainId })
            },
            async onConnect(connectInfo) {
                const accounts = await this.getAccounts()
                if (accounts.length === 0) return

                const chainId = Number(connectInfo.chainId)
                wagmiConfig.emitter.emit('connect', { accounts, chainId })

                // Manage EIP-1193 event listeners
                const provider = await this.getProvider()
                if (provider) {
                    if (connect) {
                        provider.removeListener('connect', connect)
                        connect = undefined
                    }
                    if (!accountsChanged) {
                        accountsChanged = this.onAccountsChanged.bind(this)
                        // Provider uses Ox, which uses `readonly Address.Address[]` for `accountsChanged`,
                        // while Connector `accountsChanged` is `string[]`
                        provider.on('accountsChanged', accountsChanged as never)
                    }
                    if (!chainChanged) {
                        chainChanged = this.onChainChanged.bind(this)
                        provider.on('chainChanged', chainChanged)
                    }
                    if (!disconnect) {
                        disconnect = this.onDisconnect.bind(this)
                        provider.on('disconnect', disconnect)
                    }
                }
            },
            async onDisconnect() {
                const provider = await this.getProvider()
                wagmiConfig.emitter.emit('disconnect');
                if (provider) {
                    if (chainChanged) {
                        provider.removeListener('chainChanged', chainChanged)
                        chainChanged = undefined
                    }
                    if (disconnect) {
                        provider.removeListener('disconnect', disconnect)
                        disconnect = undefined
                    }
                    if (!connect) {
                        connect = this.onConnect.bind(this)
                        provider.on('connect', connect)
                    }
                }
            },
            async setup() {
                if (!connect) {
                    const provider = await this.getProvider()
                    connect = this.onConnect.bind(this)
                    provider.on('connect', connect)
                }
            },
            type: 'injected',
            id: 'xyz.openfort.rapidsafe',
            name: 'Rapidsafe',
        }
    })
}