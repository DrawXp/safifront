import { defineChain } from 'viem'

export const pharos = defineChain({
  id: 688689,
  name: 'Pharos Atlantic',
  nativeCurrency: { name: 'PHRS', symbol: 'PHRS', decimals: 18 },
  rpcUrls: { default: { http: [import.meta.env.VITE_RPC_PHAROS] } },
})
