import { useEffect, useMemo, useState, useCallback } from 'react'
import { useAccount, usePublicClient, useWalletClient, useSwitchChain } from 'wagmi'
import type { Address } from 'viem'
import vaultRewardAbi from '../abis/VaultReward.json'

const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 688689)
const VAULT_REWARD = (
  (import.meta.env.VITE_VAULT_REWARD ?? import.meta.env.VITE_VAULTREWARD)
) as Address

export function useVaultReward() {
  const { address, chainId } = useAccount()
  const publicClient = usePublicClient({ chainId: CHAIN_ID })
  const { data: walletClient } = useWalletClient()
  const { switchChainAsync } = useSwitchChain()

  const [pending, setPending] = useState<bigint | null>(null)
  const [claimable, setClaimable] = useState(false)
  const [amountHint, setAmountHint] = useState<bigint | null>(null)
  const [lastPaid, setLastPaid] = useState<bigint | null>(null)
  const [winner, setWinner] = useState<Address | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const contract = useMemo(() => ({
    address: VAULT_REWARD,
    abi: vaultRewardAbi as const,
  }), [])

  useEffect(() => {
    console.debug('[VR env]', { CHAIN_ID, VAULT_REWARD })
  }, [])

  const refresh = useCallback(async () => {
    if (!publicClient || !address) return
    setError(null)
    try {
      const lp = await publicClient.readContract({
        ...contract, functionName: 'lastPaidDay', args: []
      }) as bigint
      setLastPaid(lp)

      const w = await publicClient.readContract({
        ...contract, functionName: 'winnerOfDay', args: [lp]
      }) as Address
      setWinner(w)

      let pend: bigint = 0n
      try {
        pend = await publicClient.readContract({
          ...contract, functionName: 'pending', args: [address as Address],
        }) as bigint
        console.debug('[VR read] pending()', { user: address, chain: CHAIN_ID, value: pend.toString() })
      } catch (e: any) {
        console.warn('[VR read] pending() falhou, seguindo fallback', e?.message ?? e)
      }
      setPending(pend)

      let can = pend > 0n
      let hint: bigint | null = pend > 0n ? pend : null

      if (!can && w && address && w.toLowerCase() === (address as Address).toLowerCase()) {
        can = true
        try {
          const units = await publicClient.readContract({
            ...contract, functionName: 'rewardUnits', args: []
          }) as bigint
          hint = units
        } catch {}
      }

      if (!can) {
        try {
          await publicClient.simulateContract({
            account: address as Address,
            ...contract, functionName: 'claim', args: []
          })
          can = true
          if (hint === null) {
            try {
              const units = await publicClient.readContract({
                ...contract, functionName: 'rewardUnits', args: []
              }) as bigint
              hint = units
            } catch {}
          }
        } catch (e: any) {
          console.debug('[VR simulate] claim bloqueado:', e?.shortMessage ?? e?.message ?? String(e))
        }
      }

      setClaimable(can)
      setAmountHint(hint)

      console.debug('[VR state]', {
        lastPaid: lp.toString(),
        winner: w,
        pending: pend.toString(),
        claimable: can,
        amountHint: hint ? hint.toString() : null,
      })
    } catch (e: any) {
      setError(e?.message ?? 'read error')
    }
  }, [publicClient, address, contract])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 10_000)
    return () => clearInterval(id)
  }, [refresh])

  const claim = useCallback(async () => {
    setError(null)
    if (!address) throw new Error('wallet not connected')
    if (!walletClient) throw new Error('wallet client unavailable')
    try {
      if (chainId !== CHAIN_ID) {
        await switchChainAsync({ chainId: CHAIN_ID })
      }
      setLoading(true)
      console.debug('[VR write] claim...')
      const hash = await walletClient.writeContract({
        ...contract, functionName: 'claim', args: [],
        account: address as Address, chain: publicClient?.chain,
      })
      await publicClient!.waitForTransactionReceipt({ hash })
      await refresh()
      return hash
    } catch (e: any) {
      setError(e?.message ?? 'tx error')
      throw e
    } finally {
      setLoading(false)
    }
  }, [address, walletClient, chainId, switchChainAsync, contract, publicClient, refresh])

  return {
    pending,            
    claimable,          
    amountHint,         
    lastPaid,           
    winner,             
    isClaiming: loading,
    error,
    claim,
    refresh,
  }
}
