import { createPublicClient, createWalletClient, http } from 'viem';
import { Server } from './server';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
    .option('private-key', {
        type: 'string',
        description: 'Private key for wallet (or use env PRIVATE_KEY)',
        demandOption: false,
    })
    .option('rpc-url', {
        type: 'string',
        description: 'RPC URL for the chain (or use env RPC_URL)',
        demandOption: false,
    })
    .help()
    .argv as any;

const privateKey = argv['private-key'] || process.env.PRIVATE_KEY;
const rpcUrl = argv['rpc-url'] || process.env.RPC_URL;

if (!privateKey) {
    throw new Error('Private key must be provided via --private-key or environment variable PRIVATE_KEY');
}
if (!rpcUrl) {
    throw new Error('RPC URL must be provided via --rpc-url or environment variable RPC_URL');
}

async function main() {
    // Create a temporary public client to get the chainId
    const tempPublicClient = createPublicClient({
        transport: http(rpcUrl),
    });
    const chainId = await tempPublicClient.getChainId();

    const chain = {
        id: Number(chainId),
        name: 'chain-name', // Placeholder, not used
        nativeCurrency: {
            name: 'ETH',
            symbol: 'ETH',
            decimals: 18,
        },
        rpcUrls: {
            default: { http: [rpcUrl] },
            public: { http: [rpcUrl] },
        },
    };

    const publicClient = createPublicClient({
        transport: http(rpcUrl),
        chain,
    });

    const walletClient = createWalletClient({
        transport: http(rpcUrl),
        chain,
    });

    const server = new Server({
        privateKey,
        publicClient,
        walletClient,
    });
    server.start();
}

main();