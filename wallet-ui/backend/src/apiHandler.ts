import { Router, Request, Response } from 'express';
import { BaseError, ContractFunctionRevertedError, PublicClient, WalletClient, Chain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { AddressRegistry } from './abi';

declare global {
  // For typescript express req.body
  namespace Express {
    interface Request {
      body: any;
    }
  }
}

export class APIHandler {
  public router: Router;
  private privateKey: string;
  private publicClient: PublicClient;
  private walletClient: WalletClient;

  constructor(privateKey: string, publicClient: PublicClient, walletClient: WalletClient) {
    this.router = Router();
    this.privateKey = privateKey;
    this.publicClient = publicClient;
    this.walletClient = walletClient;
    this.setupRoutes();
  }

  private setupRoutes() {
    this.router.get('/api/healthz', this.healthz);
    this.router.post('/api/register-user', this.registerUser);
  }

  private healthz(req: Request, res: Response) {
    res.send('OK');
  }

  private registerUser = async (req: Request, res: Response) => {
    try {
      const { userId, address } = req.body;
      const account = privateKeyToAccount(this.privateKey as `0x${string}`);
      try {
        const { request } = await this.publicClient.simulateContract({
          account,
          address: '0x8DF5FAe7543FEc5B0E46A13dA1329298C2c0f86C',
          abi: AddressRegistry,
          functionName: 'setAddress',
          args: [userId, address],
        });
        await this.walletClient.writeContract(request);
      } catch (err) {
        console.log('Error:', err);
        if (err instanceof BaseError) {
          const revertError = err.walk((err: any) => err instanceof ContractFunctionRevertedError);
          if (revertError instanceof ContractFunctionRevertedError) {
            const errorName = revertError.data?.errorName ?? '';
            console.error('Contract function reverted:', revertError, errorName);
          }
          return res.status(409).json({ message: err.shortMessage });
        }
      }
      return res.status(201).json();
    } catch (error) {
      console.error(error);
      res.status(500).json();
    }
  };
}
