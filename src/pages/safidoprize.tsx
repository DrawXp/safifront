import { useAccount, useReadContract, useWriteContract, usePublicClient } from "wagmi"
import { useEffect, useMemo, useRef, useState } from "react"
import { formatUnits, parseUnits, type Hex } from "viem"
import toast from "react-hot-toast"

import { useVaultReward } from "../hooks/useVaultReward"

import LuckJson from "../abis/SAFILuck.json"
import ERC20Json from "../abis/ERC20.json"
import { ADDR } from "../lib/constants"

const LuckAbi = (LuckJson as any).abi ?? (LuckJson as any)
const ERC20Abi = (ERC20Json as any).abi ?? (ERC20Json as any)

const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 0)
const LUCK_ADDR = ADDR.safiLuck as `0x${string}`

function fmtDur(sec: number) {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const pad = (x: number) => x.toString().padStart(2, "0")
  return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${m}:${pad(ss)}`
}

const userLocale =
  typeof navigator !== "undefined" && navigator.language
    ? navigator.language
    : undefined

const short = (a?: `0x${string}`) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "-")

const toDateTime = (sec?: number | bigint) => {
  if (!sec) return "-"
  const d = new Date(Number(sec) * 1000)
  return d.toLocaleString(userLocale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function rget(r: any, name: string, idx: number) {
  if (!r) return undefined
  if (typeof r[name] !== "undefined") return r[name]
  return Array.isArray(r) ? r[idx] : undefined
}

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

export default function SafidoPrize() {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { writeContractAsync, isPending } = useWriteContract()
  const { pending, claim, claimable, refresh: refreshVaultReward } = useVaultReward()

  const pendingWei = (pending as bigint) ?? 0n
  // A variável pendingHuman foi removida daqui pois não é mais utilizada na interface.
  
	const [rewardJustClaimed, setRewardJustClaimed] = useState(false)
	const canClaimReward = claimable && !rewardJustClaimed
	useEffect(() => {
	  if (pendingWei === 0n && !claimable) setRewardJustClaimed(false)
	}, [pendingWei, claimable])

  const { data: ticketToken } = useReadContract({
    abi: LuckAbi,
    address: LUCK_ADDR,
    functionName: "ticketToken",
    query: { enabled: !!LUCK_ADDR, refetchOnWindowFocus: false, staleTime: 60_000 },
  })
  const { data: ticketPrice } = useReadContract({
    abi: LuckAbi,
    address: LUCK_ADDR,
    functionName: "ticketPrice",
    query: { enabled: !!LUCK_ADDR, refetchOnWindowFocus: false, staleTime: 60_000 },
  })
  const { data: curId, refetch: refetchCurId } = useReadContract({
    abi: LuckAbi,
    address: LUCK_ADDR,
    functionName: "currentRoundId",
    query: { enabled: !!LUCK_ADDR, refetchOnWindowFocus: false, staleTime: 10_000 },
  })
  const { data: currentRound, refetch: refetchCurrentRound } = useReadContract({
    abi: LuckAbi,
    address: LUCK_ADDR,
    functionName: "currentRound",
    query: { enabled: !!LUCK_ADDR, refetchOnWindowFocus: false, staleTime: 10_000 },
  })

  const ticket = ticketToken as `0x${string}` | undefined
  const priceWei = (ticketPrice as bigint) ?? 0n
  const curRoundId = Number((curId as bigint) ?? 0n)

  const curPotWei = useMemo(() => {
    const r = currentRound as any
    if (!r) return 0n
    return (r.pot ?? (Array.isArray(r) ? r[8] : 0n)) as bigint
  }, [currentRound])
  const endTs = useMemo(() => {
    const r = currentRound as any
    return Number(rget(r, "endTs", 2) ?? 0n)
  }, [currentRound])

  const { data: tokDec } = useReadContract({
    abi: ERC20Abi,
    address: ticket,
    functionName: "decimals",
    query: { enabled: !!ticket, refetchOnWindowFocus: false, staleTime: 300_000 },
  })
  const { data: tokSym } = useReadContract({
    abi: ERC20Abi,
    address: ticket,
    functionName: "symbol",
    query: { enabled: !!ticket, refetchOnWindowFocus: false, staleTime: 300_000 },
  })

  const { data: wNativeAddr } = useReadContract({
    abi: LuckAbi,
    address: LUCK_ADDR,
    functionName: "wNative",
    query: { enabled: !!LUCK_ADDR, refetchOnWindowFocus: false, staleTime: 300_000 },
  })
  const wNative = (wNativeAddr as `0x${string}` | undefined) ?? undefined

  const dec = Number(tokDec ?? 18)
  const symbol = (tokSym as string) ?? "SAFI"
  const potHuman = useMemo(() => formatUnits(curPotWei, dec), [curPotWei, dec])

  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000))
  useEffect(() => {
    const t = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(t)
  }, [])
  const eta = useMemo(() => (endTs ? Math.max(0, endTs - nowSec) : null), [endTs, nowSec])
  const prevEtaRef = useRef<number | null>(null)
  useEffect(() => {
    const prev = prevEtaRef.current
    prevEtaRef.current = eta
    if (eta === null) return
    if (prev !== null && prev > 0 && eta === 0) {
      setTimeout(() => {
        refetchCurrentRound()
        refetchCurId()
      }, 500)
      setTimeout(() => {
        refetchCurrentRound()
        refetchCurId()
      }, 3000)
      setTimeout(() => {
        refetchCurrentRound()
        refetchCurId()
      }, 8000)
    }
  }, [eta, refetchCurrentRound, refetchCurId])
  useEffect(() => {
    const i = setInterval(() => {
      refetchCurrentRound()
      refetchCurId()
    }, 10_000)
    return () => clearInterval(i)
  }, [refetchCurrentRound, refetchCurId])

  const lastId = Math.max(0, curRoundId - 1)
  const { data: lastRound, refetch: refetchLast } = useReadContract({
    abi: LuckAbi,
    address: LUCK_ADDR,
    functionName: "rounds",
    args: lastId > 0 ? [BigInt(lastId)] : undefined,
    query: { enabled: lastId > 0, refetchOnWindowFocus: false, staleTime: 15_000 },
  })
  useEffect(() => {
    if (lastId > 0) refetchLast()
  }, [lastId, refetchLast])

  const lr = lastRound as any
  const lastTotal = Number(rget(lr, "totalTickets", 7) ?? 0n)
  const lastPotWei = (rget(lr, "pot", 8) ?? 0n) as bigint
  const lastWinner = rget(lr, "winner", 9) as `0x${string}` | undefined
  const lastTicket = Number(rget(lr, "winnerTicket", 10) ?? 0n)
  const lastDeadline = Number(rget(lr, "claimDeadline", 11) ?? 0n)
  const lastClaimed = Boolean(rget(lr, "claimed", 12))
  const lastPotHuman = formatUnits(lastPotWei, dec)

  const you = (address ?? "").toLowerCase()
  const isWinner = !!address && !!lastWinner && lastWinner.toLowerCase() === you
  const expired = nowSec > lastDeadline
  const hasLastRoundData =
    lastId > 0 && !!lr && lastDeadline > 0

  const statusText = useMemo(() => {
    if (!hasLastRoundData) return ""

    if (isWinner) {
      let t = "You are the winner. "
      if (lastClaimed) t += "Already claimed. "
      else if (expired) t += "Deadline passed on-chain."
      return t
    }

    let t = "Not winner. "
    if (expired) t += "Deadline passed on-chain."
    return t
  }, [hasLastRoundData, isWinner, lastClaimed, expired])

  const [extraPrizesHuman, setExtraPrizesHuman] = useState<string[]>([])
  const [extrasLoading, setExtrasLoading] = useState(false)

  useEffect(() => {
    if (lastId <= 0 || !isWinner || lastClaimed) {
      setExtraPrizesHuman([])
      setExtrasLoading(false)
      return
    }

    let cancelled = false

    async function loadExtras() {
      if (!publicClient) {
        setExtrasLoading(false)
        return
      }

      setExtrasLoading(true)
      try {
        const res = (await publicClient.readContract({
          address: LUCK_ADDR,
          abi: LuckAbi,
          functionName: "viewRoundExtras",
          args: [BigInt(lastId)],
        })) as any
		
        const tokens: `0x${string}`[] = (res?.tokens ?? res?.[0] ?? []) as `0x${string}`[]
        const amounts: bigint[] = (res?.amounts ?? res?.[1] ?? []) as bigint[]

        if (!tokens.length) {
          if (!cancelled) {
            setExtraPrizesHuman([])
            setExtrasLoading(false)
          }
          return
        }

        const items: string[] = []

        for (let i = 0; i < tokens.length; i++) {
          const token = tokens[i]
          const amt = amounts[i] ?? 0n
          if (!token || amt === 0n) continue

          try {
            const [symRaw, decTok] = await Promise.all([
              publicClient.readContract({
                address: token,
                abi: ERC20Abi,
                functionName: "symbol",
                args: [],
              }) as Promise<string>,
              publicClient.readContract({
                address: token,
                abi: ERC20Abi,
                functionName: "decimals",
                args: [],
              }) as Promise<number | bigint>,
            ])

            const sym =
              wNative && token.toLowerCase() === wNative.toLowerCase() ? "PHRS" : symRaw
            const decN = Number(decTok ?? 18)
            const human = formatUnits(amt, decN)
            items.push(`${human} ${sym}`)
          } catch {}
        }

        if (!cancelled) setExtraPrizesHuman(items)
      } catch {
        if (!cancelled) setExtraPrizesHuman([])
      } finally {
        if (!cancelled) setExtrasLoading(false)
      }
    }

    loadExtras()

    return () => {
      cancelled = true
    }
  }, [publicClient, lastId, isWinner, lastClaimed, wNative])

  const canClaimLottery = lastId > 0 && isWinner && !lastClaimed

  async function claimLottery() {
    if (!address || !canClaimLottery) return
    if (!publicClient) {
      toast.error("Network not ready")
      return
    }

    try {
      const { request } = await publicClient.simulateContract({
        account: address,
        address: LUCK_ADDR,
        abi: LuckAbi,
        functionName: "claim",
        args: [BigInt(lastId)],
      })
      const hash = (await writeContractAsync(request as any)) as Hex
      showTxToast(hash)
      await publicClient.waitForTransactionReceipt({ hash })
      setTimeout(() => {
        refetchLast()
        refetchCurrentRound()
        refetchCurId()
      }, 1200)
    } catch {
      const hash = (await writeContractAsync({
        chainId: CHAIN_ID,
        abi: LuckAbi,
        address: LUCK_ADDR,
        functionName: "claim",
        args: [BigInt(lastId)],
      } as any)) as Hex
      showTxToast(hash)
      await publicClient.waitForTransactionReceipt({ hash })
      setTimeout(() => {
        refetchLast()
        refetchCurrentRound()
        refetchCurId()
      }, 1200)
    }
  }

  const { data: allowance, refetch: refetchAllow } = useReadContract({
    abi: ERC20Abi,
    address: ticket,
    functionName: "allowance",
    args: address && ticket ? [address, LUCK_ADDR] : undefined,
    query: { enabled: !!address && !!ticket, refetchOnWindowFocus: false, staleTime: 30_000 },
  })

  const [qty, setQty] = useState("1")
  const qtyInt = Math.max(0, Number(qty || 0)) | 0
  const totalCost = useMemo(() => priceWei * BigInt(qtyInt), [priceWei, qtyInt])
  const needApprove = useMemo(() => {
    if (allowance === undefined) return false
    const a = allowance as unknown as bigint
    return a < totalCost
  }, [allowance, totalCost])

  async function approveTickets() {
    if (!ticket) return
    const max = parseUnits("1000000000", dec)
    const h = (await writeContractAsync({
      chainId: CHAIN_ID,
      abi: ERC20Abi,
      address: ticket,
      functionName: "approve",
      args: [LUCK_ADDR, max],
    })) as Hex
    showTxToast(h)
    await refetchAllow()
  }

  async function buyTickets() {
    if (!address || qtyInt === 0 || totalCost === 0n) return
    if (needApprove) await approveTickets()
    const h = (await writeContractAsync({
      chainId: CHAIN_ID,
      abi: LuckAbi,
      address: LUCK_ADDR,
      functionName: "buyTickets",
      args: [qtyInt],
    } as any)) as Hex
    showTxToast(h)
  }

  async function claimRunnerReward() {
    if (!canClaimReward) return
    try {
      await claim()
      setRewardJustClaimed(true)
      setTimeout(() => {
        refreshVaultReward()
      }, 1200)
    } catch {}
  }

  const [showClaimMenu, setShowClaimMenu] = useState(false)
  const hasAnyClaim = canClaimLottery || canClaimReward

  return (
    <div className="page-card space-y-4 relative">
      <div className="absolute -top-5 -left-4 z-50">
        <button
          type="button"
          onClick={() => hasAnyClaim && setShowClaimMenu(!showClaimMenu)}
          disabled={!hasAnyClaim}
          className={`p-3 rounded-full shadow-xl border transition-all duration-300 ${
            hasAnyClaim
              ? "bg-slate-900 border-[var(--primary)] text-yellow-400 cursor-pointer hover:scale-110 shadow-[0_0_15px_rgba(250,204,21,0.4)]"
              : "bg-slate-900/80 border-white/10 text-gray-600 cursor-not-allowed"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={`w-6 h-6 ${hasAnyClaim ? "animate-pulse" : ""}`}
          >
            <path
              fillRule="evenodd"
              d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm4.502 8.9a2.25 2.25 0 104.496 0 25.057 25.057 0 01-4.496 0z"
              clipRule="evenodd"
            />
          </svg>
          {hasAnyClaim && (
            <span className="absolute top-0 right-0 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
            </span>
          )}
        </button>

        {showClaimMenu && hasAnyClaim && (
          <div className="absolute top-14 left-0 w-64 flex flex-col gap-2 p-3 bg-slate-900/95 border border-zinc-500 rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
            {canClaimLottery && (
              <button
                onClick={() => {
                  claimLottery()
                  setShowClaimMenu(false)
                }}
                disabled={isPending}
                className="btn-rgb text-xs py-2 shadow-lg"
              >
                Claim Lottery Prize
              </button>
            )}
            {canClaimReward && (
              <button
                onClick={() => {
                  claimRunnerReward()
                  setShowClaimMenu(false)
                }}
                disabled={isPending}
                className="btn-rgb text-xs py-2 shadow-lg"
              >
                Claim Distribution Prize
              </button>
            )}
            {!canClaimLottery && !canClaimReward && (
              <div className="text-xs text-center text-gray-400 py-1">
                Nothing to claim
              </div>
            )}
          </div>
        )}
      </div>

      <div className="w-full max-w-md mx-auto space-y-4">
        <div className="panel-card space-y-4 text-center">
          <h4 className="text-lg font-semibold">
            Round {curRoundId || "-"}
          </h4>

          <div className="text-sm text-neutral-200 space-y-0.5">
            <div className="flex items-center justify-center">
              <div className="relative inline-flex items-center">
                <div className="group relative inline-flex items-center justify-center w-4 h-4 rounded-full border border-[var(--primary)] text-[0.6rem] font-bold text-[var(--primary)] cursor-default">
                  !
                  <div className="pointer-events-none absolute top-1/2 -translate-y-1/2 -mt-1 right-full mr-3 hidden group-hover:block rounded-md border border-[var(--primary)] bg-slate-900/95 px-4 py-2 text-[11px] text-neutral-100 shadow-lg whitespace-nowrap text-left">
                    If lucky enough, the winner may earn extra rewards.
                  </div>
                </div>
                <span className="ml-2">
                  Current pot: {potHuman} {symbol}
                </span>
              </div>
            </div>
            <div>
              Next draw: {endTs ? toDateTime(endTs) : "-"}
            </div>
            <div>
              Next round: {eta !== null ? fmtDur(eta) : "-"}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-stretch justify-center gap-3">
              <button
                onClick={buyTickets}
                disabled={isPending || qtyInt === 0}
                className="btn-primary w-auto flex items-center justify-start pl-0.5 pr-1"
              >
                <img
                  src="/safiticket.webp"
                  alt="SAFI ticket"
                  className="h-[3rem] w-auto -ml-3"
                />
                <span>Buy tickets</span>
              </button>

              <input
                className="input-type"
                inputMode="numeric"
                value={qty}
                onChange={(e) =>
                  setQty(String(Math.max(0, Number(e.target.value || 0) | 0)))
                }
                placeholder="0"
              />
            </div>

            <div className="text-xs text-center pl-4">
              {formatUnits(totalCost, dec)} {symbol}
            </div>

            {needApprove && (
              <button
                onClick={approveTickets}
                disabled={isPending}
                className="btn-secondary w-auto mx-auto block"
              >
                Approve {symbol}
              </button>
            )}
          </div>

          <div className="space-y-2">
            {canClaimLottery && extrasLoading && (
              <div className="text-xs mt-1 flex items-center justify-center gap-2">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border border-transparent border-t-[var(--primary)] border-l-[var(--primary)]" />
                <span>Calculating extra prizes...</span>
              </div>
            )}

            {canClaimLottery && !extrasLoading && extraPrizesHuman.length > 0 && (
              <div className="text-xs mt-1">
                <div className="font-semibold">Extra prize:</div>
                <ul className="mt-1 space-y-0.5">
                  {extraPrizesHuman.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            )}

          {statusText && (
            <div className="text-xs opacity-70">
              {statusText}
            </div>
          )}
          </div>

          <hr className="border-t border-zinc-400/60 my-4" />

          <section className="space-y-1 text-sm">
            <h4 className="text-lg font-semibold">
              Round {lastId || "-"}
            </h4>
            <div>Total tickets: {lastTotal}</div>
            <div>
              Winner:{" "}
              {lastWinner && !/^0x0{40}$/i.test(lastWinner) ? short(lastWinner) : "none"}
              {lastTicket ? <> • Ticket: {lastTicket}</> : null}
            </div>
            <div>
              Pot: {lastPotHuman} {symbol}
            </div>
            <div>Claim deadline: {toDateTime(lastDeadline)}</div>
          </section>
        </div>
      </div>
    </div>
  )
}