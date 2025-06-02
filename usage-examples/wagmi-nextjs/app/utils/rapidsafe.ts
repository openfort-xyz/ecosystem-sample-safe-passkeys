import Rapidsafe from 'rapidsafe';
import { baseSepolia } from 'wagmi/chains';

export const ecosystemWalletInstance = new Rapidsafe({
    appChainIds: [baseSepolia.id],
    appLogoUrl: 'https://t3.ftcdn.net/jpg/02/35/26/30/240_F_235263034_miJw2igmixo7ymCqhHZ7c8wp9kaujzfM.jpg',
    appName: 'Demo',
});