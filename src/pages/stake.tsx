import { useEffect, useMemo, useState, useRef } from "react"
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWalletClient,
  usePublicClient,
  type Chain
} from "wagmi"
import { parseUnits, formatUnits, type Hex } from "viem"
import toast from "react-hot-toast"

import tokenArtifact from "../abis/SAFIToken.json"
import stakingArtifact from "../abis/SAFIStaking.json"
import vaultArtifact from "../abis/SAFIVault.json"
import { api } from "../lib/api"
import { ADDR } from "../lib/constants"

const tokenAbi = (tokenArtifact as any).abi ?? tokenArtifact
const stakingAbi = (stakingArtifact as any).abi ?? stakingArtifact
const vaultAbi = (vaultArtifact as any).abi ?? vaultArtifact

const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 0)

const pharosChain: Chain = {
  id: CHAIN_ID,
  name: 'Pharos Atlantic',
  nativeCurrency: {
    name: 'Pharos',
    symbol: 'PHRS',
    decimals: 18
  },
  rpcUrls: {
    default: { http: ['https://atlantic.dplabs-internal.com'] },
    public: { http: ['https://atlantic.dplabs-internal.com'] }
  },
  blockExplorers: {
    default: { name: 'PharosScan', url: 'https://atlantic.pharosscan.xyz' }
  },
  testnet: true
}

const ok = (a?: string) =>
  typeof a === "string" && /^0x[a-fA-F0-9]{40}$/.test(a)

const fmtLeft = (s: number) =>
  s <= 0 ? "ready" : `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${Math.floor(s % 60)}s`

function showTxToast(hash: Hex) {
  const url = `https://atlantic.pharosscan.xyz/tx/${hash}`

  setTimeout(() => {
    toast(
      (t) => (
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            window.open(url, "_blank", "noopener,noreferrer")
            toast.dismiss(t.id)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              window.open(url, "_blank", "noopener,noreferrer")
              toast.dismiss(t.id)
            }
          }}
          className={`max-w-sm rounded-2xl border border-[var(--primary)]
                    bg-slate-900/95 px-4 py-3 shadow-xl text-sm text-neutral-50
                    flex flex-col gap-1 transition cursor-pointer
                    ${t.visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"}`}
        >
          <div className="font-semibold text-[var(--primary-tint)]">Transaction submitted</div>
          <div className="break-all text-xs opacity-90">{hash}</div>
          <div className="mt-1 text-[11px] font-semibold text-[var(--primary-tint)] underline-offset-2">
            View on PharosScan
          </div>
        </div>
      ),
      {
        duration: 5000,
        position: "top-right",
      },
    )
  }, 3500)
}

export default function Stake() {
  const { address } = useAccount()
  const { data: wallet } = useWalletClient()
  const publicClient = usePublicClient()

  const { data: decimalsBn } = useReadContract({
  abi: tokenAbi,
  address: ok(ADDR.token) ? (ADDR.token as `0x${string}`) : undefined,
  functionName: "decimals",
  query: { enabled: ok(ADDR.token) },
})

  const dec = Number(decimalsBn ?? 18n)

  const hasStakeAddrs = !!address && ok(ADDR.token) && ok(ADDR.staking)

  const { data: stakeReads, refetch: refetchStakeReads } = useReadContracts({
    contracts: hasStakeAddrs
      ? ([
          {
            abi: tokenAbi,
            address: ADDR.token as `0x${string}`,
            functionName: "balanceOf",
            args: [address as `0x${string}`],
          },
          {
            abi: stakingAbi,
            address: ADDR.staking as `0x${string}`,
            functionName: "balances",
            args: [address as `0x${string}`],
          },
          {
            abi: tokenAbi,
            address: ADDR.token as `0x${string}`,
            functionName: "allowance",
            args: [address as `0x${string}`, ADDR.staking as `0x${string}`],
          },
          {
            abi: stakingAbi,
            address: ADDR.staking as `0x${string}`,
            functionName: "pendingRewards",
            args: [address as `0x${string}`],
          },
          {
            abi: stakingAbi,
            address: ADDR.staking as `0x${string}`,
            functionName: "totalStaked",
          },
        ] as const)
      : [],
    query: { enabled: hasStakeAddrs, refetchInterval: 4000 },
  })

  const tokenBalBn = stakeReads?.[0]?.result as bigint | undefined
  const stakedBn = stakeReads?.[1]?.result as bigint | undefined
  const allowanceBn = stakeReads?.[2]?.result as bigint | undefined
  const pendingBn = stakeReads?.[3]?.result as bigint | undefined
  const totalStakedBn = stakeReads?.[4]?.result as bigint | undefined

  const { data: nextSecsBn, refetch: refetchNext } = useReadContract({
	abi: vaultAbi,
	address: ok(ADDR.vault) ? (ADDR.vault as `0x${string}`) : undefined,
    functionName: "secondsToNextStakeEpoch",
	query: { enabled: ok(ADDR.vault) },
})
  const { data: previewDailyBn, refetch: refetchPreview } = useReadContract({
	abi: vaultAbi,
	address: ok(ADDR.vault) ? (ADDR.vault as `0x${string}`) : undefined,
	functionName: "previewStakeDaily",
	query: { enabled: ok(ADDR.vault) },
})
	useEffect(() => {
	  if (!publicClient) return
	  const unwatch = publicClient.watchBlockNumber({
		onBlockNumber: () => {
		  refetchStakeReads?.()
		},
		poll: true,
		pollingInterval: 2000,
	  })
	  const onVis = () => {
		if (document.visibilityState === "visible") {
		  refetchStakeReads?.()
		  refetchNext?.()
		  refetchPreview?.()
		}
	  }
	  window.addEventListener("visibilitychange", onVis)
	  window.addEventListener("focus", onVis)
	  return () => {
		unwatch()
		window.removeEventListener("visibilitychange", onVis)
		window.removeEventListener("focus", onVis)
	  }
	}, [publicClient, refetchStakeReads, refetchNext, refetchPreview])
	useEffect(() => {
  const id = setInterval(() => {
    refetchNext?.()
    refetchPreview?.()
  }, 5 * 60 * 1000)
  return () => clearInterval(id)
}, [refetchNext, refetchPreview])


  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000))
  useEffect(() => {
    const id = setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const [nextEpochTs, setNextEpochTs] = useState<number | null>(null)
  useEffect(() => {
    if (nextSecsBn == null) {
      setNextEpochTs(null)
      return
    }
    const base = Math.floor(Date.now() / 1000)
    setNextEpochTs(base + Number(nextSecsBn))
  }, [nextSecsBn])

	function waitByBlocks(hash: Hex, onDone?: () => void) {
	  if (!publicClient) return () => {}
	  const stop = publicClient.watchBlockNumber({
		onBlockNumber: async () => {
		  try {
			const r = await publicClient.getTransactionReceipt({ hash })
			if (r) {
			  stop()
			  refetchStakeReads?.()
			  refetchNext?.()
			  refetchPreview?.()
			  if (onDone) onDone()
			}
		  } catch {}
		},
		poll: true,
		pollingInterval: 1000,
	  })
	  return stop
	}

  const stats = useMemo(() => {
    const tokenBalStr = tokenBalBn ? formatUnits(tokenBalBn as bigint, dec) : "0"
    const stakedStr = stakedBn ? formatUnits(stakedBn as bigint, dec) : "0"
    const pendingStr = pendingBn ? formatUnits(pendingBn as bigint, dec) : "0"
    const totalStakedStr = totalStakedBn ? formatUnits(totalStakedBn as bigint, dec) : "0"
    const dailyEmissionNum = previewDailyBn ? Number(formatUnits(previewDailyBn as bigint, dec)) : 0

    const stakedNum = Number(stakedStr) || 0
    const totalNum = Number(totalStakedStr) || 0
    const projectedNextNum =
      stakedNum > 0 && totalNum > 0 ? (dailyEmissionNum * stakedNum) / totalNum : 0
    const aprUserPctNum = stakedNum > 0 ? (projectedNextNum / stakedNum) * 365 * 100 : 0
    const hasRewardFlag = (pendingBn ?? 0n) > 0n

    return {
      tokenBal: tokenBalStr,
      staked: stakedStr,
      pending: pendingStr,
      totalStaked: totalStakedStr,
      dailyEmission: dailyEmissionNum,
      projectedNext: projectedNextNum,
      aprUserPct: aprUserPctNum,
      hasReward: hasRewardFlag,
    }
  }, [tokenBalBn, stakedBn, pendingBn, totalStakedBn, previewDailyBn, dec])

  const tokenBal = stats.tokenBal
  const staked = stats.staked
  const pending = stats.pending
  const totalStaked = stats.totalStaked
  const dailyEmission = stats.dailyEmission
  const projectedNext = stats.projectedNext
  const aprUserPct = stats.aprUserPct
  const hasReward = stats.hasReward

  const nextLeft = nextEpochTs == null ? 0 : Math.max(0, nextEpochTs - nowSec)
  const canRun = nextLeft === 0
  const canClaim = hasReward


  const [tab, setTab] = useState<"stake" | "unstake">("stake")

  const [amtStake, setAmtStake] = useState("")
  const [amtUnstake, setAmtUnstake] = useState("")
  const [debouncedAmtStake, setDebouncedAmtStake] = useState("")
  const [debouncedAmtUnstake, setDebouncedAmtUnstake] = useState("")
  const [showRunTip, setShowRunTip] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedAmtStake(amtStake)
    }, 300)
    return () => window.clearTimeout(id)
  }, [amtStake])

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedAmtUnstake(amtUnstake)
    }, 300)
    return () => window.clearTimeout(id)
  }, [amtUnstake])

  const runTipTimer = useRef<number | null>(null)
  const [isApproving, setIsApproving] = useState(false)
  
  const on2dec = (v: string) => {
    const norm = v.replace(",", ".").replace(/[^\d.]/g, "")
    const [a, b = ""] = norm.split(".")
    return (b ? `${a}.${b.slice(0, 2)}` : a) || ""
  }
  const wantStake = useMemo(() => {
    try {
      return parseUnits(debouncedAmtStake || "0", dec)
    } catch {
      return 0n
    }
  }, [debouncedAmtStake, dec])
  const wantUnstake = useMemo(() => {
    try {
      return parseUnits(debouncedAmtUnstake || "0", dec)
    } catch {
      return 0n
    }
  }, [debouncedAmtUnstake, dec])


  const [reqRun, setReqRun] = useState<any>()
  const [reqClaim, setReqClaim] = useState<any>()
  const [reqClaimStake, setReqClaimStake] = useState<any>()
  const [reqStake, setReqStake] = useState<any>()
  const [reqUnstake, setReqUnstake] = useState<any>()
  const [reqApprove, setReqApprove] = useState<any>()

  useEffect(() => {
    if (!publicClient || !address || !ok(ADDR.vault)) {
      setReqRun(undefined)
      return
    }
    publicClient
      .simulateContract({
        account: address,
        address: ADDR.vault as `0x${string}`,
        abi: vaultAbi,
        functionName: "run",
        args: [],
      })
      .then((r) => setReqRun(r.request))
      .catch(() => setReqRun(undefined))
  }, [publicClient, address, ADDR.vault, nextSecsBn])

  useEffect(() => {
    if (!publicClient || !address || !ok(ADDR.staking)) {
      setReqClaim(undefined)
      return
    }
    publicClient
      .simulateContract({
        account: address,
        address: ADDR.staking as `0x${string}`,
        abi: stakingAbi,
        functionName: "claim",
        args: [],
      })
      .then((r) => setReqClaim(r.request))
      .catch(() => setReqClaim(undefined))
  }, [publicClient, address, ADDR.staking, pendingBn])

  useEffect(() => {
    if (!publicClient || !address || !ok(ADDR.staking)) {
      setReqClaimStake(undefined)
      return
    }
    publicClient
      .simulateContract({
        account: address,
        address: ADDR.staking as `0x${string}`,
        abi: stakingAbi,
        functionName: "claimAndStake",
        args: [],
      })
      .then((r) => setReqClaimStake(r.request))
      .catch(() => setReqClaimStake(undefined))
  }, [publicClient, address, ADDR.staking, pendingBn])

  useEffect(() => {
    if (!publicClient || !address || !ok(ADDR.staking)) {
      setReqStake(undefined)
      return
    }
    if (wantStake <= 0n) {
      setReqStake(undefined)
      return
    }
    if ((allowanceBn ?? 0n) < wantStake) {
      setReqStake(undefined)
      return
    }
    publicClient
      .simulateContract({
        account: address,
        address: ADDR.staking as `0x${string}`,
        abi: stakingAbi,
        functionName: "stake",
        args: [wantStake],
      })
      .then((r) => setReqStake(r.request))
      .catch(() => setReqStake(undefined))
  }, [publicClient, address, ADDR.staking, wantStake, allowanceBn])

  useEffect(() => {
    if (!publicClient || !address || !ok(ADDR.staking)) {
      setReqUnstake(undefined)
      return
    }
    if (wantUnstake <= 0n) {
      setReqUnstake(undefined)
      return
    }
    publicClient
      .simulateContract({
        account: address,
        address: ADDR.staking as `0x${string}`,
        abi: stakingAbi,
        functionName: "unstake",
        args: [wantUnstake],
      })
      .then((r) => setReqUnstake(r.request))
      .catch(() => setReqUnstake(undefined))
  }, [publicClient, address, ADDR.staking, wantUnstake])

  useEffect(() => {
    if (!publicClient || !address || !ok(ADDR.token) || !ok(ADDR.staking)) {
      setReqApprove(undefined)
      return
    }
    if (wantStake <= 0n || (allowanceBn ?? 0n) >= wantStake) {
      setReqApprove(undefined)
      return
    }
    publicClient
      .simulateContract({
        account: address,
        address: ADDR.token as `0x${string}`,
        abi: tokenAbi,
        functionName: "approve",
        args: [ADDR.staking as `0x${string}`, wantStake],
      })
      .then((r) => setReqApprove(r.request))
      .catch(() => setReqApprove(undefined))
  }, [publicClient, address, ADDR.token, ADDR.staking, wantStake, allowanceBn])

  async function doRun() {
    if (!wallet || !ok(ADDR.vault)) return alert("Connect wallet")
    try {
		const hash = (await wallet.writeContract({
		  chain: pharosChain,
		  address: ADDR.vault as `0x${string}`,
		  abi: vaultAbi,
		  functionName: "run",
		  args: [],
		})) as Hex
      waitByBlocks(hash)
      showTxToast(hash)
      api.bountyHint(hash).catch(() => {})
      setTimeout(() => api.bountyHint(hash).catch(() => {}), 4000)
      setTimeout(() => api.bountyHint(hash).catch(() => {}), 15000)
    } catch {}
  }

  async function doStake() {
    if (!wallet) return alert("Connect wallet")
    if (!ok(ADDR.token) || !ok(ADDR.staking)) return alert("Bad addresses")
    const need = wantStake
    if (need <= 0n) return

    if ((allowanceBn ?? 0n) < need) {
      try {
        setIsApproving(true)
        const hash = (await wallet.writeContract({
          chain: pharosChain,
          address: ADDR.token as `0x${string}`,
          abi: tokenAbi,
          functionName: "approve",
          args: [ADDR.staking as `0x${string}`, need],
        })) as Hex

        waitByBlocks(hash, () => {
          setTimeout(() => {
            setIsApproving(false)
          }, 1200)
        })

        showTxToast(hash)
      } catch {
        setIsApproving(false)
      }
      return
    }

    const hash = (await wallet.writeContract({
      chain: pharosChain,
      address: ADDR.staking as `0x${string}`,
      abi: stakingAbi,
      functionName: "stake",
      args: [need],
    })) as Hex
    waitByBlocks(hash)
    showTxToast(hash)
  }

  async function doClaim() {
    if (!wallet || !ok(ADDR.staking)) return alert("Connect wallet")
    const hash = (await wallet.writeContract({
      chain: pharosChain,
      address: ADDR.staking as `0x${string}`,
      abi: stakingAbi,
      functionName: "claim",
      args: [],
    })) as Hex
    waitByBlocks(hash)
    showTxToast(hash)
  }

  async function doClaimAndStake() {
    if (!wallet || !ok(ADDR.staking)) return alert("Connect wallet")
    const hash = (await wallet.writeContract({
      chain: pharosChain,
      address: ADDR.staking as `0x${string}`,
      abi: stakingAbi,
      functionName: "claimAndStake",
      args: [],
    })) as Hex
    waitByBlocks(hash)
    showTxToast(hash)
  }

  async function doUnstake() {
    if (!wallet || !ok(ADDR.staking)) return alert("Connect wallet")
    const need = wantUnstake
    if (need <= 0n) return
    const hash = (await wallet.writeContract({
      chain: pharosChain,
      address: ADDR.staking as `0x${string}`,
      abi: stakingAbi,
      functionName: "unstake",
      args: [need],
    })) as Hex
    waitByBlocks(hash)
    showTxToast(hash)
  }

  const availableToken = trimZeros(tokenBal)

  return (
    <div className="page-card space-y-4">
      <div className="w-full max-w-md mx-auto space-y-4">
        <div className="panel-card space-y-4">
          <div className="flex items-center justify-start gap-3">
            <div className="toggle-group">
              <button
                type="button"
                className={tab === "stake" ? "btn-primary w-auto" : "btn-primary-wip w-auto"}
                onClick={() => setTab("stake")}
              >
                Stake
              </button>
              <button
                type="button"
                className={tab === "unstake" ? "btn-primary w-auto" : "btn-primary-wip w-auto"}
                onClick={() => setTab("unstake")}
              >
                Unstake
              </button>
            </div>
          </div>

          {tab === "stake" ? (
            <section className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <input
                    value={amtStake}
                    onChange={(e) => setAmtStake(on2dec(e.target.value))}
                    placeholder="0.0"
                    inputMode="decimal"
                    className="input-type"
                  />
                  <button
                    onClick={() =>
                      setAmtStake(trimZeros(formatUnits(tokenBalBn ?? 0n, dec)))
                    }
                    className="btn-secondary w-auto text-xs px-3 py-1"
                  >
                    Max
                  </button>
                </div>
                <div className="text-xs opacity-70">
                  Available: {availableToken} SAFI
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={doStake}
                  disabled={wantStake <= 0n || isApproving}
                  className={wantStake > 0n && !isApproving ? "btn-primary w-auto" : "btn-primary-wip w-auto"}
                >
                  {isApproving ? "Waiting approval..." : reqApprove ? "Approve" : "Stake"}
                </button>
                <span className="flex-1" />
                <div className="flex items-center gap-2 relative">
                  <button
                    onClick={doRun}
                    disabled={!canRun}
                    className={canRun ? "btn-rgb w-auto" : "btn-primary-wip w-auto"}
                  >
                    Run distribution
                  </button>
                  {canRun && (
                    <>
                      <span
                        className="w-4 h-4 rounded-full border border-neutral-400 text-[0.625rem] flex items-center justify-center opacity-80 cursor-help"
                        onMouseEnter={() => {
                          if (runTipTimer.current !== null) clearTimeout(runTipTimer.current)
                          runTipTimer.current = window.setTimeout(() => setShowRunTip(true), 500)
                        }}
                        onMouseLeave={() => {
                          if (runTipTimer.current !== null) {
                            clearTimeout(runTipTimer.current)
                            runTipTimer.current = null
                          }
                          setShowRunTip(false)
                        }}
                      >
                        !
                      </span>
                      {showRunTip && (
                        <div
                          className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 w-64 text-xs rounded-md bg-slate-900/95 text-neutral-50 border border-[var(--primary)] px-2 py-1 shadow-lg z-20"
                        >
                          Distribution is ready. Run it to generate claimable rewards. You can
                          claim it on SafidoPrize page.
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1 text-sm text-neutral-200">
                <div>
                  Staked balance: <b>{trimZeros(staked)} SAFI</b>
                </div>
                <div>
                  Pending rewards: <b>{trimZeros(pending)} SAFI</b>
                </div>
                <div>
                  Projected next payout:{" "}
                  <b>{projectedNext ? projectedNext.toFixed(6) : "0"} SAFI</b>
                </div>
                <div>
                  APR estimate: <b>{aprUserPct ? aprUserPct.toFixed(2) : "0.0"}%</b>
                </div>
                <div>
                  Next payout in: <b>{fmtLeft(nextLeft)}</b>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={doClaim}
                  disabled={!canClaim}
                  className={canClaim ? "btn-primary w-auto" : "btn-primary-wip w-auto"}
                >
                  Claim
                </button>
                <button
                  onClick={doClaimAndStake}
                  disabled={!canClaim}
                  className={canClaim ? "btn-primary w-auto" : "btn-primary-wip w-auto"}
                >
                  Claim &amp; Stake
                </button>
              </div>
            </section>
          ) : (
            <section className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <input
                    value={amtUnstake}
                    onChange={(e) => setAmtUnstake(on2dec(e.target.value))}
                    placeholder="0.0"
                    inputMode="decimal"
                    className="input-type"
                  />
                  <button
                    onClick={() =>
                      setAmtUnstake(trimZeros(formatUnits(stakedBn ?? 0n, dec)))
                    }
                    className="btn-secondary w-auto text-xs px-3 py-1"
                  >
                    Max
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={doUnstake}
                  disabled={wantUnstake <= 0n}
                  className={wantUnstake > 0n ? "btn-primary w-auto" : "btn-primary-wip w-auto"}
                >
                  Unstake
                </button>
                <span className="flex-1" />
                <div className="flex items-center gap-2 relative">
                  <button
                    onClick={doRun}
                    disabled={!canRun}
                    className={canRun ? "btn-rgb w-auto" : "btn-primary-wip w-auto"}
                  >
                    Run distribution
                  </button>
                  {canRun && (
                    <>
                      <span
                        className="w-4 h-4 rounded-full border border-neutral-400 text-[0.625rem] flex items-center justify-center opacity-80 cursor-help"
                        onMouseEnter={() => {
                          if (runTipTimer.current !== null) clearTimeout(runTipTimer.current)
                          runTipTimer.current = window.setTimeout(() => setShowRunTip(true), 500)
                        }}
                        onMouseLeave={() => {
                          if (runTipTimer.current !== null) {
                            clearTimeout(runTipTimer.current)
                            runTipTimer.current = null
                          }
                          setShowRunTip(false)
                        }}
                      >
                        !
                      </span>
                      {showRunTip && (
                        <div
                          className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 w-64 text-xs rounded-md bg-slate-900/95 text-neutral-50 border border-[var(--primary)] px-2 py-1 shadow-lg z-20"
                        >
                          Distribution is ready. Run it to generate claimable rewards. You can
                          claim it on SafidoPrize page.
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1 text-sm text-neutral-200">
                <div>
                  Currently staked: <b>{trimZeros(staked)} SAFI</b>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )

}

function trimZeros(s: string) {
  if (!s.includes(".")) return s
  return s.replace(/\.?0+$/, "")
}