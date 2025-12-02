import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http, webSocket, fallback } from 'viem';

const WC = import.meta.env.VITE_WC_PROJECT_ID as string;

const RPC_HTTP_1 = (import.meta.env.VITE_RPC_HTTP_1 || '').trim();
const RPC_HTTP_2 = (import.meta.env.VITE_RPC_HTTP_2 || '').trim();
const RPC_WSS    = (import.meta.env.VITE_RPC_WSS || '').trim();

export const pharosAtlantic = {
  id: Number(import.meta.env.VITE_CHAIN_ID),
  name: 'Pharos Atlantic',
  nativeCurrency: { name: 'PHRS', symbol: 'PHRS', decimals: 18 },
  rpcUrls: {
    default: {
      http: [RPC_HTTP_1, RPC_HTTP_2].filter(Boolean),
      webSocket: RPC_WSS ? [RPC_WSS] : [],
    },
  },
  blockExplorers: {
    default: { name: 'PharosScan', url: 'https://atlantic.pharosscan.xyz' },
  },
} as const;

function buildTransports() {
  const stack: any[] = [];
  if (RPC_WSS) stack.push(webSocket(RPC_WSS));
  if (RPC_HTTP_1) stack.push(http(RPC_HTTP_1));
  if (RPC_HTTP_2) stack.push(http(RPC_HTTP_2));
  if (stack.length === 0) {
    throw new Error('Defina pelo menos um endpoint em VITE_RPC_HTTP_1, VITE_RPC_HTTP_2 ou VITE_RPC_WSS');
  }
  return fallback(stack);
}

export const wagmiConfig = getDefaultConfig({
  appName: 'SAFIDO PROJECT',
  projectId: WC,
  chains: [pharosAtlantic],
  transports: {
    [pharosAtlantic.id]: buildTransports(),
  },
  ssr: true,
});
