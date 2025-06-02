import express, { Express } from 'express';
import { PublicClient, WalletClient } from 'viem';
import cors from 'cors';
import dotenv from 'dotenv';
import { APIHandler } from './apiHandler';
import helmet from 'helmet';


dotenv.config();

export interface ServerOptions {
  privateKey: string;
  publicClient: PublicClient;
  walletClient: WalletClient;
}

export class Server {
  private app: Express;
  private apiHandler: APIHandler;
  private port: number | string;

  constructor(options: ServerOptions) {
    this.app = express();
    this.port = process.env.PORT ?? 3000;
    this.apiHandler = new APIHandler(options.privateKey, options.publicClient, options.walletClient);

    // Configure CORS based on environment
    const corsOptions = {
      origin: process.env.NODE_ENV === 'production'
        ? ['https://safe-id.sample.openfort.xyz']
        : '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    };

    // Add security headers
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: { policy: "same-site" },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: "deny" },
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      ieNoOpen: true,
      noSniff: true,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      xssFilter: true
    }));

    this.app.use(cors(corsOptions));
    this.app.use(express.json());
    this.app.use(this.apiHandler.router);
  }

  public start() {
    this.app.listen(this.port, () => {
      console.log(`Server listening on port ${this.port}`);
    });
  }
}
