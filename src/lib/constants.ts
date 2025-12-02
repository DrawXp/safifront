export const ADDR = {
  token:       import.meta.env.VITE_TOKEN        as `0x${string}`,
  staking:     import.meta.env.VITE_STAKING      as `0x${string}`,
  faucet:      import.meta.env.VITE_FAUCET       as `0x${string}`,
  vault:       import.meta.env.VITE_VAULT        as `0x${string}`,
  vaultReward: (
    import.meta.env.VITE_VAULT_REWARD ??
    import.meta.env.VITE_VAULTREWARD
  ) as `0x${string}`,

  swapVault:      import.meta.env.VITE_SWAP_VAULT       as `0x${string}`,
  pairWphrsSafi:  import.meta.env.VITE_PAIR_WPHRS_SAFI  as `0x${string}`,
  wphrs:          import.meta.env.VITE_WPHRS            as `0x${string}`,
  factory:        import.meta.env.VITE_FACTORY          as `0x${string}`,
  router:         import.meta.env.VITE_ROUTER           as `0x${string}`,
  safiLuck:       import.meta.env.VITE_SAFILUCK         as `0x${string}`,
} as const
