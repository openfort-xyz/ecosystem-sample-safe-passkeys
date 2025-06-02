import type { Address } from 'ox'
import { baseSepolia } from 'viem/chains'
import { ChainId } from './Wagmi'


export const ethAsset = {
  address: '0x0000000000000000000000000000000000000000',
  decimals: 18,
  logo: '/icons/eth.svg',
  name: 'Ethereum',
  symbol: 'ETH',
} as const

export const defaultAssets: Record<
  ChainId,
  ReadonlyArray<{
    name: string
    logo: string
    symbol: string
    decimals: number
    address: Address.Address
    price?: number
  }>
> = {
  [baseSepolia.id]: [
    {
      address: '0x0000000000000000000000000000000000000000',
      decimals: 18,
      logo: '/icons/eth.svg',
      name: 'Ethereum',
      symbol: 'ETH',
    },
    {
      address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      decimals: 6,
      logo: '/icons/usdc.svg',
      name: 'USD Coin',
      symbol: 'USDC',
    },
    {
      address: '0x4200000000000000000000000000000000000006',
      decimals: 18,
      logo: '/icons/weth.svg',
      name: 'Wrapped Ether',
      symbol: 'WETH',
    },
  ],
}
