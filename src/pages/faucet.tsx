import { useEffect, useMemo, useState } from "react"
import { useAccount, useReadContract, useWalletClient, usePublicClient } from "wagmi"
import { formatUnits, type Hex } from "viem"
import toast from "react-hot-toast"

import faucetArtifact from "../abis/SAFIFaucet.json"
import tokenArtifact from "../abis/SAFIToken.json"
import { ADDR } from "../lib/constants"

const faucetAbi = (faucetArtifact as any).abi ?? (faucetArtifact as any)
const tokenAbi = (tokenArtifact as any).abi ?? (tokenArtifact as any)

const ok = (a?: string) => typeof a === "string" && /^0x[a-fA-F0-9]{40}$/.test(a)
const fmtLeft = (s: number) =>
  s <= 0 ? "ready" : `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${Math.floor(s % 60)}s`

function showTxToast(hash: Hex) {
  const url = `https://atlantic.pharosscan.xyz/tx/${hash}`

  setTimeout(() => {
    toast(
      t => (
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            window.open(url, "_blank", "noopener,noreferrer")
            toast.dismiss(t.id)
          }}
          onKeyDown={e => {
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

function waitByBlocks(
  publicClient: ReturnType<typeof usePublicClient>,
  hash: Hex,
  onDone: () => void,
) {
  if (!publicClient) {
    onDone()
    return
  }
  const stop = publicClient.watchBlockNumber({
    onBlockNumber: async () => {
      try {
        const r = await publicClient.getTransactionReceipt({ hash })
        if (r) {
          stop()
          onDone()
        }
      } catch {}
    },
    poll: true,
    pollingInterval: 1000,
  })
}

export default function Faucet() {
  const { address } = useAccount()
  const { data: wallet } = useWalletClient()
  const publicClient = usePublicClient()
  const [txPending, setTxPending] = useState(false)

  const { data: decimalsBn } = useReadContract({
    abi: tokenAbi,
    address: ok(ADDR.token) ? (ADDR.token as `0x${string}`) : undefined,
    functionName: "decimals",
    query: { enabled: ok(ADDR.token) },
  })
  const decimals = Number(decimalsBn ?? 18n)

  const { data: claimAmountBn } = useReadContract({
    abi: faucetAbi,
    address: ok(ADDR.faucet) ? (ADDR.faucet as `0x${string}`) : undefined,
    functionName: "claimAmount",
    query: { enabled: ok(ADDR.faucet) },
  })

  const { data: cooldownBn } = useReadContract({
    abi: faucetAbi,
    address: ok(ADDR.faucet) ? (ADDR.faucet as `0x${string}`) : undefined,
    functionName: "COOLDOWN",
    query: { enabled: ok(ADDR.faucet) },
  })
  const cooldownSec = Number(cooldownBn ?? 0n)

  const { data: lastClaimBn, refetch: refetchLast } = useReadContract({
    abi: faucetAbi,
    address: ok(ADDR.faucet) ? (ADDR.faucet as `0x${string}`) : undefined,
    functionName: "lastClaim",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address && ok(ADDR.faucet) },
  })

  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(t)
  }, [])

  const nextAt = useMemo(
    () => Number(lastClaimBn ?? 0n) + cooldownSec,
    [lastClaimBn, cooldownSec],
  )
  const secondsLeft = Math.max(0, nextAt - now)

  const progress = useMemo(() => {
    if (cooldownSec <= 0) return 1
    const done = cooldownSec - secondsLeft
    if (done <= 0) return 0
    if (done >= cooldownSec) return 1
    return done / cooldownSec
  }, [cooldownSec, secondsLeft])

  const claimHuman = claimAmountBn
    ? trimZeros(formatUnits(claimAmountBn as bigint, decimals))
    : "—"

  async function claim() {
    if (!wallet) {
      toast.error("Connect wallet")
      return
    }
    if (!ok(ADDR.faucet)) {
      toast.error("Bad FAUCET address")
      return
    }
    if (secondsLeft > 0) return
    if (!publicClient) {
      toast.error("Network not ready")
      return
    }

    setTxPending(true)
    try {
      const tx = (await wallet.writeContract({
        chain: publicClient.chain,
        address: ADDR.faucet as `0x${string}`,
        abi: faucetAbi,
        functionName: "claim",
        args: [],
      })) as Hex
      showTxToast(tx)
      waitByBlocks(publicClient, tx, () => {
        refetchLast()
        setTxPending(false)
      })
    } catch (err: any) {
      setTxPending(false)
      toast.error(err?.shortMessage || "Claim failed")
    }
  }

  const disabled = txPending || secondsLeft > 0

  return (
    <div className="page-card space-y-4">
      <div className="w-full max-w-md mx-auto">
        <div className="panel-card space-y-4 text-center">
          <h3 className="text-xl font-semibold">Receive SAFI daily</h3>
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={claim}
              disabled={disabled}
              className={
                (disabled ? "btn-primary-wip" : "btn-primary") +
                " !w-auto inline-flex btn-pill btn-pad30"
              }
            >
              {txPending
                ? "Submitting…"
                : secondsLeft > 0
                ? fmtLeft(secondsLeft)
                : `Claim ${claimHuman} SAFI`}
            </button>

            {cooldownSec > 0 && (
              <div className="w-full max-w-xs">
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-[var(--primary)] transition-all duration-300"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function trimZeros(s: string) {
  if (!s.includes(".")) return s
  return s.replace(/\.?0+$/, "")
}