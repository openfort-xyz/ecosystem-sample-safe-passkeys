"use client";

import { ExternalLink } from "lucide-react";
import { Logo } from "../Logo";

export function Header() {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 text-center">
      <h1 className="text-3xl md:text-3xl font-mono flex items-center gap-2 justify-center">
        <a 
          href="https://www.npmjs.com/package/rapidsafe" 
          target="_blank"
          rel="noopener noreferrer"
          className="group"
        >
          <span>Demo</span>
        </a>
      </h1>
      <p className="text-muted-foreground font-medium text-sm md:text-base flex flex-col items-center">
        {`This a demo cross-app wallet created with `}
        <span className="flex items-center justify-center">
          <Logo className="inline-block h-6 mr-2" />
          <span className="flex items-center font-bold hover:underline">
            <a key={'openfort-documentation'} href={'https://www.openfort.io/docs/products/cross-app-wallet/setup'} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Ecosystem SDK 
            </a>
            <ExternalLink className="w-3 h-3 ml-1 text-muted-foreground" /> 
          </span>
          , SAFE smart account and Rhinestone passkey module.
        </span>
        <br/>
        {`It's a powerful passkey based wallet with simple UX and seamless integration.`}
      </p>
    </div>
  );
}