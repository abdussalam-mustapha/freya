import { configureChains, createConfig } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import { injectedWallet, metaMaskWallet } from '@rainbow-me/rainbowkit/wallets';

// Define Sonic mainnet without ENS contracts
const sonicMainnet = {
  id: 146,
  name: 'Sonic Mainnet',
  network: 'sonic-mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Sonic',
    symbol: 'S',
  },
  rpcUrls: {
    public: { http: ['https://rpc.soniclabs.com'] },
    default: { http: ['https://rpc.soniclabs.com'] },
  },
  blockExplorers: {
    default: { name: 'SonicScan', url: 'https://sonicscan.org' },
  },
  testnet: false,
  // Explicitly disable ENS contracts
  contracts: {
    ensRegistry: undefined,
    ensUniversalResolver: undefined,
    multicall3: undefined,
  },
};

// Configure chains with only Sonic mainnet to avoid ENS issues
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [sonicMainnet],
  [publicProvider()],
  {
    pollingInterval: 4000,
    // Disable ENS resolution
    ens: false,
  }
);

// Use simple connector configuration to avoid provider conflicts
const connectors = connectorsForWallets([
  {
    groupName: 'Recommended',
    wallets: [
      injectedWallet({ chains }),
      metaMaskWallet({ 
        projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '2f5a2b1c3d4e5f6a7b8c9d0e1f2a3b4c',
        chains 
      }),
    ],
  },
]);

export const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
});

export { chains };
