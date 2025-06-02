import { AppMetadata, Client } from "@openfort/ecosystem-js/client";
import { icon } from "./icon";

class EcosystemWallet extends Client {
    constructor(appMetadata?: AppMetadata) {
        super({
            baseConfig: {
                ecosystemWalletDomain: 'https://safe-id.sample.openfort.xyz/',
                passkeys: true,
                windowStrategy: 'iframe',
            },
            appMetadata,
            appearance: {
                icon: `data:image/vndmicrosofticon;base64,${icon}`,
                logo: 'https://blog-cms.openfort.xyz/uploads/realm_logo_e7139e4dfe.png',
                name: 'RapidSafe',
                reverseDomainNameSystem: 'xyz.openfort.rapidsafe'
            }
        });

        // Use a Proxy to allow for new method additions
        return new Proxy(this, {
            get: (target, prop) => {
                if (prop in target) {
                    const value = target[prop as keyof EcosystemWallet];
                    return typeof value === 'function' ? value.bind(target) : value;
                }
                return undefined;
            }
        });
    }

}

export default EcosystemWallet;