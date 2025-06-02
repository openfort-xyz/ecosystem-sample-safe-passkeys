import { rapidsafe, RapidsafeParameters } from '../providers/RapidsafeProvider/Connector';
import { http, createConfig, createStorage } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'

const RapidsafeConfig: RapidsafeParameters = {
  rpId: window.location.hostname
};
// Sepolia Base is set as the default chain if the app developer doesnt specify which chain during SDK initialization
export const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    rapidsafe(RapidsafeConfig),
  ],
  multiInjectedProviderDiscovery: false,
  storage: createStorage({ storage: localStorage }),
  transports: {
    [baseSepolia.id]: http("https://newest-radial-gadget.base-sepolia.quiknode.pro/a33177b3c598ebf17b67f1f0f3d4c4f2d7c04913")
  },
})
export type Chain = (typeof config.chains)[number]
export type ChainId = Chain['id']
export const getChainConfig = (chainId: ChainId) =>
  config.chains.find((c) => c.id === chainId)

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
