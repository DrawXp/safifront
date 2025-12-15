import { useEffect, useMemo, useState, useRef } from "react"
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  useBalance,
  usePublicClient,
} from "wagmi"
import { parseUnits, formatUnits, type Hex } from "viem"
import toast from "react-hot-toast"

import RouterJson from "../abis/Router.json"
import ERC20Json from "../abis/ERC20.json"
import PairJson from "../abis/Pair.json"
import WPHRSJson from "../abis/WPHRS.json"
import { ADDR } from "../lib/constants"
import { api, type DexPairsResponse } from "../lib/api"

const RouterAbi: any[] = (RouterJson as any).abi ?? (RouterJson as any)
const ERC20Abi: any[] = (ERC20Json as any).abi ?? (ERC20Json as any)
const PairAbi: any[] = (PairJson as any).abi ?? (PairJson as any)
const WPHRSAbi: any[] = (WPHRSJson as any).abi ?? (WPHRSJson as any)

const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 0)

type TokenMeta = { addr?: `0x${string}`; sym: string; dec: number }
type PairRow = { pair: `0x${string}`; t0: `0x${string}`; t1: `0x${string}` }

const PAIRS_STORAGE_KEY = "safi_dex_pairs_v1"
const CATALOG_STORAGE_KEY = "safi_dex_catalog_v1"
const SNAP_KEY = "safi_dex_pairs_snapshot_v1"

const fixedDown = (s: string, dec = 8) => {
  if (!s) return s
  const [i, d = ""] = s.split(".")
  return d.length > dec ? `${i}.${d.slice(0, dec)}` : s
}
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`
const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`

function getAmountOutUniV2(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
): bigint {
  if (amountIn <= 0n || reserveIn <= 0n || reserveOut <= 0n) return 0n
  const feeNum = 9985n
  const feeDen = 10000n
  const amountInWithFee = amountIn * feeNum
  const num = amountInWithFee * reserveOut
  const den = reserveIn * feeDen + amountInWithFee
  if (den <= 0n) return 0n
  return num / den
}

function getAmountInUniV2(
  amountOut: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
): bigint {
  if (
    amountOut <= 0n ||
    reserveIn <= 0n ||
    reserveOut <= 0n ||
    amountOut >= reserveOut
  )
    return 0n
  const feeNum = 997n
  const feeDen = 1000n
  const num = reserveIn * amountOut * feeDen
  const den = (reserveOut - amountOut) * feeNum
  if (den <= 0n) return 0n
  return num / den + 1n
}

export default function Swap() {
  const pub = usePublicClient()
  const { address } = useAccount()
  const { writeContractAsync, isPending } = useWriteContract()

  const [pairs, setPairs] = useState<PairRow[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const raw = window.localStorage.getItem(PAIRS_STORAGE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw) as PairRow[]
      if (!Array.isArray(parsed)) return []
      return parsed
    } catch {
      return []
    }
  })

  const [catalog, setCatalog] = useState<Record<string, TokenMeta>>(() => {
    const base: Record<string, TokenMeta> = {
      PHRS: { sym: "PHRS", dec: 18 },
      [ADDR.wphrs.toLowerCase()]: {
        addr: ADDR.wphrs,
        sym: "WPHRS",
        dec: 18,
      },
    }
    if (typeof window === "undefined") return base
    try {
      const raw = window.localStorage.getItem(CATALOG_STORAGE_KEY)
      if (!raw) return base
      const parsed = JSON.parse(raw) as Record<string, TokenMeta>
      if (!parsed || typeof parsed !== "object") return base
      return { ...parsed, ...base }
    } catch {
      return base
    }
  })

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SNAP_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as DexPairsResponse
      if (!parsed || !Array.isArray(parsed.pairs) || !parsed.pairs.length) return

      const rows: PairRow[] = parsed.pairs
        .filter((p) => {
          const r0 = BigInt(p.reserve0)
          const r1 = BigInt(p.reserve1)
          const ts = BigInt(p.totalSupply)
          return r0 > 0n && r1 > 0n && ts > 0n
        })
        .map((p) => ({
          pair: p.pair as `0x${string}`,
          t0: p.token0 as `0x${string}`,
          t1: p.token1 as `0x${string}`,
        }))

      setPairs(rows)

      const nextCatalog: Record<string, TokenMeta> = {
        PHRS: { sym: "PHRS", dec: 18 },
        [ADDR.wphrs.toLowerCase()]: { addr: ADDR.wphrs, sym: "WPHRS", dec: 18 },
      }

      for (const p of parsed.pairs) {
        const k0 = p.token0.toLowerCase()
        const k1 = p.token1.toLowerCase()

        const pAny = p as any

        if (!nextCatalog[k0]) {
          const sym0 =
            p.symbol0 && p.symbol0.trim().length ? p.symbol0 : shortAddr(k0)
          const dec0 =
            typeof pAny.decimals0 === "number" ? pAny.decimals0 : 18
          nextCatalog[k0] = {
            addr: p.token0 as `0x${string}`,
            sym: sym0,
            dec: dec0,
          }
        }

        if (!nextCatalog[k1]) {
          const sym1 =
            p.symbol1 && p.symbol1.trim().length ? p.symbol1 : shortAddr(k1)
          const dec1 =
            typeof pAny.decimals1 === "number" ? pAny.decimals1 : 18
          nextCatalog[k1] = {
            addr: p.token1 as `0x${string}`,
            sym: sym1,
            dec: dec1,
          }
        }
      }

      setCatalog((prev) => ({
        ...nextCatalog,
        ...prev,
      }))
    } catch {}
  }, [])

async function fetchMeta(addr: `0x${string}`): Promise<TokenMeta> {
  const client = pub
  if (!client) return { addr, sym: shortAddr(addr), dec: 18 }

  try {
    const [sym, name, dec] = await Promise.all([
      client
        .readContract({
          abi: ERC20Abi,
          address: addr,
          functionName: "symbol",
          args: [],
        })
        .catch(() => null),
      client
        .readContract({
          abi: ERC20Abi,
          address: addr,
          functionName: "name",
          args: [],
        })
        .catch(() => null),
      client
        .readContract({
          abi: ERC20Abi,
          address: addr,
          functionName: "decimals",
          args: [],
        })
        .catch(() => 18),
    ])
    let s = (sym ?? "").toString().trim()
    if (!s) s = (name ?? "").toString().trim()
    if (!s) s = shortAddr(addr)
    if (s.length > 16) s = s.slice(0, 16)
    return { addr, sym: s, dec: Number(dec ?? 18) }
  } catch {
    return { addr, sym: shortAddr(addr), dec: 18 }
  }
}

  useEffect(() => {
    let alive = true

    api
      .dexPairs()
      .then((res: DexPairsResponse) => {
        if (!alive) return

        try {
          window.localStorage.setItem(SNAP_KEY, JSON.stringify(res))
        } catch {}

        const rows: PairRow[] = res.pairs
          .filter((p) => {
            const r0 = BigInt(p.reserve0)
            const r1 = BigInt(p.reserve1)
            const ts = BigInt(p.totalSupply)
            return r0 > 0n && r1 > 0n && ts > 0n
          })
          .map((p) => ({
            pair: p.pair as `0x${string}`,
            t0: p.token0 as `0x${string}`,
            t1: p.token1 as `0x${string}`,
          }))

        setPairs(rows)

        const symbolsSeed: Record<string, string> = {}
        for (const p of res.pairs) {
          if (p.symbol0) {
            symbolsSeed[p.token0.toLowerCase()] = p.symbol0
          }
          if (p.symbol1) {
            symbolsSeed[p.token1.toLowerCase()] = p.symbol1
          }
        }

        const addrs = Array.from(
          new Set(rows.flatMap((x) => [x.t0, x.t1]).map((x) => x.toLowerCase())),
        )

        setCatalog((prev) => {
          const next = { ...prev }
          for (const a of addrs) {
            const seedSym = symbolsSeed[a]
            const existing = next[a]
            if (!existing) {
              next[a] = {
                addr: a as `0x${string}`,
                sym: seedSym || shortAddr(a),
                dec: 18,
              }
            } else if (seedSym && existing.sym === shortAddr(a)) {
              next[a] = {
                ...existing,
                sym: seedSym,
              }
            }
          }
          next[ADDR.wphrs.toLowerCase()] = {
            addr: ADDR.wphrs,
            sym: "WPHRS",
            dec: next[ADDR.wphrs.toLowerCase()]?.dec ?? 18,
          }
          return next
        })

        Promise.allSettled(addrs.map((a) => fetchMeta(a as `0x${string}`))).then(
          (all) => {
            setCatalog((prev) => {
              const next = { ...prev }
              for (const r of all) {
                if (r.status === "fulfilled" && r.value.addr) {
                  next[r.value.addr.toLowerCase()] = r.value
                }
              }
              return next
            })
          },
        )
      })
      .catch(() => {})

    return () => {
      alive = false
    }
  }, [pub])

  const tokenOptions = useMemo(() => {
    const out: Array<{ key: string; label: string }> = [
      { key: "PHRS", label: "PHRS" },
    ]
    for (const [k, v] of Object.entries(catalog)) {
      if (k !== "PHRS") out.push({ key: k, label: v.sym || short(k) })
    }
    return out.sort((a, b) => {
      const prio = (s: string) =>
        s === "PHRS" ? 0 : s === ADDR.wphrs.toLowerCase() ? 1 : 2
      return prio(a.key) - prio(b.key) || a.label.localeCompare(b.label)
    })
  }, [catalog])

  const [fromKey, setFromKey] = useState<string>("PHRS")
  const [toKey, setToKey] = useState<string>(ADDR.wphrs.toLowerCase())

  const fromMeta: TokenMeta | undefined =
    fromKey === "PHRS" ? catalog["PHRS"] : catalog[fromKey]
  const toMeta: TokenMeta | undefined =
    toKey === "PHRS" ? catalog["PHRS"] : catalog[toKey]

  const fromDec = fromKey === "PHRS" ? 18 : fromMeta?.dec ?? 18
  const toDec = toKey === "PHRS" ? 18 : toMeta?.dec ?? 18

  const [amountIn, setAmountIn] = useState("")
  const [amountOut, setAmountOut] = useState("")
  const [editingSide, setEditingSide] = useState<"from" | "to">("from")
  const [debouncedAmountIn, setDebouncedAmountIn] = useState("")
  const [debouncedAmountOut, setDebouncedAmountOut] = useState("")
  const [slipBps, setSlipBps] = useState(100)
  const [noLiqTo, setNoLiqTo] = useState(false)

  useEffect(() => {
    if (editingSide !== "from") return
    const id = window.setTimeout(() => {
      setDebouncedAmountIn(amountIn)
    }, 300)
    return () => {
      window.clearTimeout(id)
    }
  }, [amountIn, editingSide])

  useEffect(() => {
    if (editingSide !== "to") return
    const id = window.setTimeout(() => {
      setDebouncedAmountOut(amountOut)
    }, 300)
    return () => {
      window.clearTimeout(id)
    }
  }, [amountOut, editingSide])

  const amtInWei = useMemo(() => {
    try {
      return debouncedAmountIn ? parseUnits(debouncedAmountIn, fromDec) : 0n
    } catch {
      return 0n
    }
  }, [debouncedAmountIn, fromDec])

  const isWrap = fromKey === "PHRS" && toKey === ADDR.wphrs.toLowerCase()
  const isUnwrap = fromKey === ADDR.wphrs.toLowerCase() && toKey === "PHRS"
  const sameKey = fromKey === toKey
  const isRouterSwap = !(isWrap || isUnwrap)

  const addrForKey = (k: string) =>
    k === "PHRS" ? ADDR.wphrs.toLowerCase() : k.toLowerCase()

  const neighbors = useMemo(() => {
    const g = new Map<string, Set<string>>()
    for (const p of pairs) {
      const a = p.t0.toLowerCase()
      const b = p.t1.toLowerCase()
      if (!g.has(a)) g.set(a, new Set())
      if (!g.has(b)) g.set(b, new Set())
      g.get(a)!.add(b)
      g.get(b)!.add(a)
    }
    return g
  }, [pairs])

  function findRoute(aKey: string, bKey: string): `0x${string}`[] | undefined {
    const a = addrForKey(aKey)
    const b = addrForKey(bKey)
    if (a === b) return undefined

    const hasPair = (x: string, y: string) =>
      pairs.some((p) => {
        const t0 = p.t0.toLowerCase()
        const t1 = p.t1.toLowerCase()
        return (t0 === x && t1 === y) || (t0 === y && t1 === x)
      })

    if (hasPair(a, b)) return [a as `0x${string}`, b as `0x${string}`]

    const w = ADDR.wphrs.toLowerCase()
    if (a !== w && b !== w && hasPair(a, w) && hasPair(w, b))
      return [a as `0x${string}`, w as `0x${string}`, b as `0x${string}`]

    const vis = new Set<string>([a])
    const q: string[] = [a]
    const parent = new Map<string, string>()
    while (q.length) {
      const cur = q.shift()!
      if (!neighbors.has(cur)) continue
      for (const nb of neighbors.get(cur)!) {
        if (vis.has(nb)) continue
        vis.add(nb)
        parent.set(nb, cur)
        if (nb === b) {
          const path = [b]
          let x = b
          while (parent.has(x)) {
            x = parent.get(x)!
            path.push(x)
          }
          path.reverse()
          if (path.length <= 3) return path as `0x${string}`[]
          return undefined
        }
        const depth = (() => {
          let d = 0
          let c = cur
          while (parent.has(c)) {
            d++
            c = parent.get(c)!
          }
          return d
        })()
        if (depth < 1) q.push(nb)
      }
    }
    return undefined
  }

  const path: `0x${string}`[] | undefined = useMemo(() => {
    if (!isRouterSwap || sameKey || !fromMeta || !toMeta) return undefined
    return findRoute(fromKey, toKey)
  }, [isRouterSwap, sameKey, fromMeta, toMeta, fromKey, toKey, pairs])

  const routeLabels = useMemo(() => {
    if (!path || !path.length) return null
    const labels: string[] = []
    path.forEach((addr) => {
      const lower = addr.toLowerCase()
      const meta = catalog[lower]
      labels.push(meta?.sym ?? shortAddr(addr))
    })
    if (fromKey === "PHRS") {
      labels.unshift("PHRS")
    }
    if (toKey === "PHRS") {
      const lastAddr = path[path.length - 1].toLowerCase()
      const lastIsWrapped = lastAddr === ADDR.wphrs.toLowerCase()
      if (lastIsWrapped) {
        labels.push("PHRS")
      }
    }
    return labels
  }, [path, catalog, fromKey, toKey])

  function pairFor(x: string, y: string): `0x${string}` | null {
    const row = pairs.find((p) => {
      const a = p.t0.toLowerCase()
      const b = p.t1.toLowerCase()
      return (
        (a === x.toLowerCase() && b === y.toLowerCase()) ||
        (a === y.toLowerCase() && b === x.toLowerCase())
      )
    })
    return row?.pair ?? null
  }

  const hop0Pair = useMemo(
    () => (path && path.length >= 2 ? pairFor(path[0], path[1]) : null),
    [path, pairs],
  )
  const hop1Pair = useMemo(
    () => (path && path.length === 3 ? pairFor(path[1], path[2]) : null),
    [path, pairs],
  )

  const hopContracts = useMemo(() => {
    const items: {
      key: "h0_tok0" | "h0_resv" | "h1_tok0" | "h1_resv"
      contract: {
        abi: any[]
        address: `0x${string}`
        functionName: "token0" | "getReserves"
      }
    }[] = []

    if (hop0Pair) {
      items.push({
        key: "h0_tok0",
        contract: {
          abi: PairAbi,
          address: hop0Pair,
          functionName: "token0",
        },
      })
      items.push({
        key: "h0_resv",
        contract: {
          abi: PairAbi,
          address: hop0Pair,
          functionName: "getReserves",
        },
      })
    }

    if (hop1Pair) {
      items.push({
        key: "h1_tok0",
        contract: {
          abi: PairAbi,
          address: hop1Pair,
          functionName: "token0",
        },
      })
      items.push({
        key: "h1_resv",
        contract: {
          abi: PairAbi,
          address: hop1Pair,
          functionName: "getReserves",
        },
      })
    }

    return items
  }, [hop0Pair, hop1Pair])

  const { data: hopReads, refetch: refetchHops } = useReadContracts({
    contracts: hopContracts.map((x) => x.contract),
    query: { enabled: hopContracts.length > 0 },
  })

  useEffect(() => {
    if (!path || !isRouterSwap || hopContracts.length === 0) return
    const id = window.setInterval(() => {
      refetchHops()
    }, 30000)
    return () => {
      window.clearInterval(id)
    }
  }, [path, isRouterSwap, hopContracts.length, refetchHops])

  const { hop0Tok0, hop0Resv, hop1Tok0, hop1Resv } = useMemo(() => {
    let h0Tok0: string | undefined
    let h0Res: [bigint, bigint, number] | undefined
    let h1Tok0: string | undefined
    let h1Res: [bigint, bigint, number] | undefined

    if (hopReads && hopContracts.length) {
      hopContracts.forEach((entry, i) => {
        const result = (hopReads[i] as any)?.result
        if (!result) return
        if (entry.key === "h0_tok0") h0Tok0 = result as string
        if (entry.key === "h0_resv") h0Res = result as [bigint, bigint, number]
        if (entry.key === "h1_tok0") h1Tok0 = result as string
        if (entry.key === "h1_resv") h1Res = result as [bigint, bigint, number]
      })
    }

    return {
      hop0Tok0: h0Tok0,
      hop0Resv: h0Res,
      hop1Tok0: h1Tok0,
      hop1Resv: h1Res,
    }
  }, [hopReads, hopContracts])

  const outWei = useMemo(() => {
    if (sameKey) return 0n
    if (isWrap || isUnwrap) return amtInWei
    if (!isRouterSwap || amtInWei === 0n || !path) return 0n
    if (!hop0Resv || !hop0Tok0) return 0n

    if (path.length === 2) {
      const [r0, r1] = hop0Resv as [bigint, bigint, number]
      const token0 = (hop0Tok0 as string).toLowerCase()

      const inAddr = addrForKey(fromKey)
      const inIs0 = inAddr === token0
      const reserveIn = inIs0 ? r0 : r1
      const reserveOut = inIs0 ? r1 : r0

      return getAmountOutUniV2(amtInWei, reserveIn, reserveOut)
    }

    if (path.length === 3) {
      if (!hop1Resv || !hop1Tok0) return 0n

      const [r0a, r1a] = hop0Resv as [bigint, bigint, number]
      const [r0b, r1b] = hop1Resv as [bigint, bigint, number]
      const token0a = (hop0Tok0 as string).toLowerCase()
      const token0b = (hop1Tok0 as string).toLowerCase()

      const inAddr = addrForKey(fromKey)
      const midAddr = path[1].toLowerCase()

      const inIs0 = inAddr === token0a
      const reserveIn0 = inIs0 ? r0a : r1a
      const reserveOut0 = inIs0 ? r1a : r0a
      const midAmount = getAmountOutUniV2(amtInWei, reserveIn0, reserveOut0)
      if (midAmount === 0n) return 0n

      const midIs0 = midAddr === token0b
      const reserveIn1 = midIs0 ? r0b : r1b
      const reserveOut1 = midIs0 ? r1b : r0b
      return getAmountOutUniV2(midAmount, reserveIn1, reserveOut1)
    }

    return 0n
  }, [
    sameKey,
    isWrap,
    isUnwrap,
    isRouterSwap,
    amtInWei,
    path,
    hop0Resv,
    hop1Resv,
    hop0Tok0,
    hop1Tok0,
    fromKey,
  ])

  useEffect(() => {
    if (editingSide !== "from") return

    if (sameKey) {
      setAmountOut(amountIn)
      return
    }

    if (isWrap || isUnwrap) {
      setAmountOut(amountIn)
      return
    }

    if (!isRouterSwap || amtInWei === 0n || !path) {
      setAmountOut("")
      setLastQuotedOutWei(0n)
      return
    }

    if (outWei === 0n) {
      setAmountOut("")
      setLastQuotedOutWei(0n)
      return
    }

    try {
      const human = fixedDown(formatUnits(outWei, toDec), 8)
      setAmountOut(human)
      setLastQuotedOutWei(outWei)
    } catch {
      setAmountOut("")
      setLastQuotedOutWei(0n)
    }
  }, [
    editingSide,
    sameKey,
    isWrap,
    isUnwrap,
    isRouterSwap,
    amtInWei,
    outWei,
    amountIn,
    path,
    toDec,
  ])

  useEffect(() => {
    if (editingSide !== "to") return

    setNoLiqTo(false)

    if (!amountOut) {
      setAmountIn("")
      return
    }

    if (sameKey || isWrap || isUnwrap) {
      setAmountIn(amountOut)
      return
    }

    if (!isRouterSwap || !path || path.length < 2) {
      setAmountIn("")
      return
    }

    if (!debouncedAmountOut) return

    try {
      const outWeiLocal = parseUnits(debouncedAmountOut, toDec)
      if (outWeiLocal <= 0n) {
        setAmountIn("")
        return
      }

      let neededIn: bigint = 0n

      if (path.length === 2) {
        if (!hop0Resv || !hop0Tok0) {
          setAmountIn("")
          return
        }

        const [r0, r1] = hop0Resv as [bigint, bigint, number]
        const token0 = (hop0Tok0 as string).toLowerCase()

        const inAddr = addrForKey(fromKey)
        const inIs0 = inAddr.toLowerCase() === token0
        const reserveIn = inIs0 ? r0 : r1
        const reserveOut = inIs0 ? r1 : r0

        neededIn = getAmountInUniV2(outWeiLocal, reserveIn, reserveOut)
      } else if (path.length === 3) {
        if (!hop0Resv || !hop1Resv || !hop0Tok0 || !hop1Tok0) {
          setAmountIn("")
          return
        }

        const [r0a, r1a] = hop0Resv as [bigint, bigint, number]
        const [r0b, r1b] = hop1Resv as [bigint, bigint, number]
        const token0a = (hop0Tok0 as string).toLowerCase()
        const token0b = (hop1Tok0 as string).toLowerCase()

        const midAddr = path[1].toLowerCase()
        const inAddr = addrForKey(fromKey)

        const midIs0 = midAddr === token0b
        const rIn1 = midIs0 ? r0b : r1b
        const rOut1 = midIs0 ? r1b : r0b
        const midNeeded = getAmountInUniV2(outWeiLocal, rIn1, rOut1)
        if (midNeeded === 0n) {
          setAmountIn("")
          setNoLiqTo(true)
          return
        }

        const inIs0 = inAddr.toLowerCase() === token0a
        const rIn0 = inIs0 ? r0a : r1a
        const rOut0 = inIs0 ? r1a : r0a
        neededIn = getAmountInUniV2(midNeeded, rIn0, rOut0)
      }

      if (neededIn === 0n) {
        setAmountIn("")
        setNoLiqTo(true)
        return
      }

      const human = fixedDown(formatUnits(neededIn, fromDec), 8)
      setAmountIn(human)
    } catch {
      setAmountIn("")
    }
  }, [
    editingSide,
    amountOut,
    debouncedAmountOut,
    sameKey,
    isWrap,
    isUnwrap,
    isRouterSwap,
    path,
    toDec,
    fromDec,
    hop0Resv,
    hop1Resv,
    hop0Tok0,
    hop1Tok0,
    fromKey,
    toKey,
  ])

  const minOutWei = useMemo(
    () =>
      isWrap || isUnwrap
        ? outWei
        : (outWei * BigInt(10000 - slipBps)) / 10000n,
    [outWei, slipBps, isWrap, isUnwrap],
  )

  const priceImpactBps = useMemo(() => {
    if (
      sameKey ||
      amtInWei === 0n ||
      outWei === 0n ||
      isWrap ||
      isUnwrap ||
      !path
    )
      return 0

    function hopMid(
      inAddr: string,
      _outAddr: string,
      resv: any,
      tok0?: string,
    ): { num: bigint; den: bigint } | null {
      if (!resv) return null
      const [r0, r1] = resv as [bigint, bigint, number]
      const token0 = (tok0 ?? "").toLowerCase()
      const aIs0 = inAddr.toLowerCase() === token0
      const rIn = aIs0 ? r0 : r1
      const rOut = aIs0 ? r1 : r0
      return { num: rOut, den: rIn }
    }

    let num = 1n
    let den = 1n
    const h0 = hopMid(path[0], path[1], hop0Resv, hop0Tok0 as string | undefined)
    if (!h0) return 0
    num *= h0.num
    den *= h0.den

    if (path.length === 3) {
      const h1 = hopMid(
        path[1],
        path[2],
        hop1Resv,
        hop1Tok0 as string | undefined,
      )
      if (!h1) return 0
      num *= h1.num
      den *= h1.den
    }

    if (den === 0n) return 0
    const SCALE = 10n ** 18n
    const midScaled = (num * SCALE) / den
    const execScaled = (outWei * SCALE) / amtInWei
    if (midScaled === 0n || execScaled >= midScaled) return 0
    return Number(((midScaled - execScaled) * 10000n) / midScaled)
  }, [sameKey, amtInWei, outWei, isWrap, isUnwrap, path, hop0Resv, hop1Resv, hop0Tok0, hop1Tok0])

  const fromAddr = fromMeta?.addr
  const needApprove = isRouterSwap && !!fromAddr && !sameKey
  const { data: curAllowBn, refetch: refetchAllow } = useReadContract({
    abi: ERC20Abi,
    address: fromAddr,
    functionName: "allowance",
    args: address && fromAddr ? [address, ADDR.router] : undefined,
    query: { enabled: !!(address && fromAddr && needApprove) },
  })
  const lacksAllowance = useMemo(
    () =>
      needApprove ? (((curAllowBn ?? 0n) as bigint) < amtInWei) : false,
    [needApprove, curAllowBn, amtInWei],
  )

  const [approveHash, setApproveHash] = useState<Hex | null>(null)
  const { isSuccess: approveMined } = useWaitForTransactionReceipt({
    chainId: CHAIN_ID,
    hash: approveHash ?? undefined,
    confirmations: 1,
    query: { enabled: !!approveHash },
  })
  useEffect(() => {
    if (approveMined) {
      refetchAllow()
      setApproveHash(null)
    }
  }, [approveMined, refetchAllow])

  async function approveFrom() {
    if (!fromAddr) return
    const max = parseUnits("1000000000000", fromDec)
    const hash = await writeContractAsync({
      chainId: CHAIN_ID,
      abi: ERC20Abi,
      address: fromAddr,
      functionName: "approve",
      args: [ADDR.router, max],
    })
    setApproveHash(hash as Hex)
  }
  const [lastQuotedOutWei, setLastQuotedOutWei] = useState<bigint>(0n)
  const [isRecalcChecking, setIsRecalcChecking] = useState(false)

  const deadline = useMemo(
    () => BigInt(Math.floor(Date.now() / 1000) + 15 * 60),
    [],
  )

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
                      ${
                        t.visible
                          ? "opacity-100 translate-x-0"
                          : "opacity-0 translate-x-4"
                      }`}
          >
            <div className="font-semibold text-[var(--primary-tint)]">
              Transaction submitted
            </div>
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

  async function doSwap() {
    if (!address || sameKey || amtInWei === 0n || minOutWei === 0n) return

    let finalMinOutWei = minOutWei

    if (isRouterSwap && path && hopContracts.length > 0 && amtInWei > 0n) {
      try {
        setIsRecalcChecking(true)
        const fresh = await refetchHops()
        const freshData = fresh?.data ?? hopReads

        let newHop0Tok0: string | undefined
        let newHop0Res: [bigint, bigint, number] | undefined
        let newHop1Tok0: string | undefined
        let newHop1Res: [bigint, bigint, number] | undefined

        if (freshData && hopContracts.length) {
          hopContracts.forEach((entry, i) => {
            const result = (freshData[i] as any)?.result
            if (!result) return
            if (entry.key === "h0_tok0") newHop0Tok0 = result as string
            if (entry.key === "h0_resv") newHop0Res = result as [bigint, bigint, number]
            if (entry.key === "h1_tok0") newHop1Tok0 = result as string
            if (entry.key === "h1_resv") newHop1Res = result as [bigint, bigint, number]
          })
        }

        let newOutWei = 0n

        if (path.length === 2 && newHop0Res && newHop0Tok0) {
          const [r0, r1] = newHop0Res
          const token0 = newHop0Tok0.toLowerCase()
          const inAddr = addrForKey(fromKey)
          const inIs0 = inAddr === token0
          const reserveIn = inIs0 ? r0 : r1
          const reserveOut = inIs0 ? r1 : r0
          newOutWei = getAmountOutUniV2(amtInWei, reserveIn, reserveOut)
        } else if (path.length === 3 && newHop0Res && newHop1Res && newHop0Tok0 && newHop1Tok0) {
          const [r0a, r1a] = newHop0Res
          const [r0b, r1b] = newHop1Res
          const token0a = newHop0Tok0.toLowerCase()
          const token0b = newHop1Tok0.toLowerCase()
          const inAddr = addrForKey(fromKey)
          const midAddr = path[1].toLowerCase()

          const inIs0 = inAddr === token0a
          const reserveIn0 = inIs0 ? r0a : r1a
          const reserveOut0 = inIs0 ? r1a : r0a
          const midAmount = getAmountOutUniV2(amtInWei, reserveIn0, reserveOut0)

          if (midAmount > 0n) {
            const midIs0 = midAddr === token0b
            const reserveIn1 = midIs0 ? r0b : r1b
            const reserveOut1 = midIs0 ? r1b : r0b
            newOutWei = getAmountOutUniV2(midAmount, reserveIn1, reserveOut1)
          } else {
            newOutWei = 0n
          }
        }

        if (lastQuotedOutWei > 0n && newOutWei > 0n) {
          const base = lastQuotedOutWei
          const diff = base > newOutWei ? base - newOutWei : newOutWei - base
          const diffBps = (diff * 10000n) / base

          if (diffBps > 100n) {
            try {
              const human = fixedDown(formatUnits(newOutWei, toDec), 8)
              setAmountOut(human)
              setLastQuotedOutWei(newOutWei)
            } catch {}
            await new Promise((resolve) => setTimeout(resolve, 500))
            setIsRecalcChecking(false)
            return
          }
        }

        if (newOutWei > 0n) {
          setLastQuotedOutWei(newOutWei)
          finalMinOutWei = isWrap || isUnwrap
            ? newOutWei
            : (newOutWei * BigInt(10000 - slipBps)) / 10000n
        }
      } catch {
      } finally {
        setIsRecalcChecking(false)
      }
    }

    try {
      if (isWrap) {
        const hash = await writeContractAsync({
          chainId: CHAIN_ID,
          abi: WPHRSAbi,
          address: ADDR.wphrs,
          functionName: "deposit",
          value: amtInWei,
        } as any)
        showTxToast(hash as Hex)
        return
      }

      if (isUnwrap) {
        const hash = await writeContractAsync({
          chainId: CHAIN_ID,
          abi: WPHRSAbi,
          address: ADDR.wphrs,
          functionName: "withdraw",
          args: [amtInWei],
        } as any)
        showTxToast(hash as Hex)
        return
      }

      if (!path) throw new Error("Route not available")

      if (fromKey === "PHRS") {
        const hash = await writeContractAsync({
          chainId: CHAIN_ID,
          abi: RouterAbi,
          address: ADDR.router,
          functionName: "swapExactPHRSForTokens",
          args: [finalMinOutWei, path, address, deadline],
          value: amtInWei,
        } as any)
        showTxToast(hash as Hex)
      } else if (toKey === "PHRS") {
        if (lacksAllowance) {
          await approveFrom()
          return
        }
        const hash = await writeContractAsync({
          chainId: CHAIN_ID,
          abi: RouterAbi,
          address: ADDR.router,
          functionName: "swapExactTokensForPHRS",
          args: [amtInWei, minOutWei, path, address, deadline],
        } as any)
        showTxToast(hash as Hex)
      } else {
        if (lacksAllowance) {
          await approveFrom()
          return
        }
        const hash = await writeContractAsync({
          chainId: CHAIN_ID,
          abi: RouterAbi,
          address: ADDR.router,
          functionName: "swapExactTokensForTokens",
          args: [amtInWei, minOutWei, path, address, deadline],
        } as any)
        showTxToast(hash as Hex)
      }
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Swap error")
    }
  }

  const disabled =
    isPending ||
    sameKey ||
    amtInWei === 0n ||
    (isRouterSwap && fromAddr && lacksAllowance) ||
    (isRouterSwap && !path)

  const { data: natBal } = useBalance({
    address,
    chainId: CHAIN_ID,
    query: { enabled: !!address && fromKey === "PHRS" },
  })
  const { data: ercBalBn } = useReadContract({
    abi: ERC20Abi,
    address: fromAddr,
    functionName: "balanceOf",
    args: address && fromAddr ? [address] : undefined,
    query: { enabled: !!address && !!fromAddr },
  })
  const availableHuman = useMemo(() => {
    if (!address) return "0"
    if (fromKey === "PHRS") {
      const v = natBal?.value ?? 0n
      const d = natBal?.decimals ?? 18
      try {
        return fixedDown(formatUnits(v, d), 8)
      } catch {
        return "0"
      }
    }

    const raw = ercBalBn as unknown
    const v = typeof raw === "bigint" ? raw : 0n

    try {
      return fixedDown(formatUnits(v, fromDec), 8)
    } catch {
      return "0"
    }
  }, [address, fromKey, natBal, ercBalBn, fromDec])

  function flip() {
    if (fromKey === toKey) return
    setFromKey(toKey)
    setToKey(fromKey)
  }
  function setFromSafe(k: string) {
    if (k === toKey) setToKey(fromKey)
    setFromKey(k)
  }
  function setToSafe(k: string) {
    if (k === fromKey) setFromKey(toKey)
    setToKey(k)
  }

  const fromLabel =
    fromKey === "PHRS"
      ? "PHRS"
      : catalog[fromKey]?.sym ?? short(fromKey)
  const toLabel =
    toKey === "PHRS" ? "PHRS" : catalog[toKey]?.sym ?? short(toKey)

  const [showSlipTip, setShowSlipTip] = useState(false)
  const slipTipTimer = useRef<number | null>(null)
  const [slipMenuOpen, setSlipMenuOpen] = useState(false)
  const [fromOpen, setFromOpen] = useState(false)
  const [toOpen, setToOpen] = useState(false)
  useEffect(() => {
    return () => {
      if (slipTipTimer.current !== null) {
        clearTimeout(slipTipTimer.current)
        slipTipTimer.current = null
      }
    }
  }, [])
  const slipPct = slipBps / 100

  function handleSlipInputChange(value: string) {
    const num = Number(value.replace(",", "."))
    if (Number.isNaN(num)) return
    const clamped = Math.max(0, Math.min(50, num))
    setSlipBps(Math.round(clamped * 100))
  }

  return (
    <div className="page-card space-y-4">
      <div className="w-full max-w-md mx-auto space-y-4">
        <div className="panel-card space-y-2 w-full text-neutral-200">
          <label className="block text-sm font-medium">From</label>
          <div className="flex gap-2 justify-center">
            <div
              className="relative"
              onMouseEnter={() => {
                if (!tokenOptions.length) return
                setFromOpen(true)
              }}
              onMouseLeave={() => setFromOpen(false)}
            >
              <button
                type="button"
                className="input-type-sm flex items-center justify-between w-full cursor-pointer"
              >
                <span className="truncate">{fromLabel}</span>
                <span className="ml-2 text-xs">▾</span>
              </button>

              {fromOpen && tokenOptions.length > 0 && (
                <div className="dropdown-menu">
                  {tokenOptions.map((o) => (
                    <button
                      type="button"
                      key={o.key}
                      className="dropdown-option"
                      onClick={() => {
                        setFromSafe(o.key)
                        setFromOpen(false)
                      }}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <input
              className="input-type"
              placeholder="0.0"
              value={amountIn}
              onChange={(e) => {
                setEditingSide("from")
                setAmountIn(fixedDown(e.target.value, 8))
              }}
              inputMode="decimal"
            />
          </div>
          <div className="text-xs opacity-70 text-center">
            Available: {availableHuman} {fromLabel}
          </div>
        </div>

        <div className="flex justify-center">
          <button onClick={flip} className="btn-secondary w-auto">
            ⇅
          </button>
        </div>

        <div className="panel-card space-y-2 w-full text-neutral-200">
          <label className="block text-sm font-medium text-neutral-200">
            To
          </label>
          <div className="flex gap-2 justify-center">
            <div
              className="relative"
              onMouseEnter={() => {
                if (!tokenOptions.length) return
                setToOpen(true)
              }}
              onMouseLeave={() => setToOpen(false)}
            >
              <button
                type="button"
                className="input-type-sm flex items-center justify-between w-full cursor-pointer"
              >
                <span className="truncate">{toLabel}</span>
                <span className="ml-2 text-xs">▾</span>
              </button>

              {toOpen && tokenOptions.length > 0 && (
                <div className="dropdown-menu">
                  {tokenOptions.map((o) => (
                    <button
                      type="button"
                      key={o.key}
                      className="dropdown-option"
                      onClick={() => {
                        setToSafe(o.key)
                        setToOpen(false)
                      }}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <input
              className="input-type"
              placeholder="0.0"
              value={amountOut}
              onChange={(e) => {
                setEditingSide("to")
                setAmountOut(fixedDown(e.target.value, 8))
              }}
              inputMode="decimal"
            />
          </div>
          {isRouterSwap && path && routeLabels ? (
            <div className="text-xs opacity-80 text-center">
              Route: {routeLabels.join(" → ")}
            </div>
          ) : null}
          {isRouterSwap && !path ? (
            <div className="text-xs text-amber-700 text-center">
              No available route. Add liquidity for one of the legs.
            </div>
          ) : null}
			{noLiqTo && (
			  <div className="text-xs text-amber-700 text-center">
				Insufficient liquidity for this amount.
			  </div>
			)}
        </div>

        <div>
          <div className="flex items-center justify-center mb-1 gap-6">
            <div
              className="flex items-center gap-2"
              onMouseEnter={() => {
                if (slipTipTimer.current !== null) {
                  clearTimeout(slipTipTimer.current)
                }
                slipTipTimer.current = window.setTimeout(() => {
                  setShowSlipTip(true)
                }, 500)
              }}
              onMouseLeave={() => {
                if (slipTipTimer.current !== null) {
                  clearTimeout(slipTipTimer.current)
                  slipTipTimer.current = null
                }
                setShowSlipTip(false)
              }}
            >
              <span className="w-4 h-4 rounded-full border border-neutral-400 text-[0.625rem] flex items-center justify-center opacity-80">
                i
              </span>
              <span className="block text-sm">Slippage (%)</span>

              {showSlipTip && (
                <div className="absolute mt-8 w-64 text-xs rounded-md bg-slate-900/95 text-neutral-50 border border-[var(--primary)] px-2 py-1 shadow-lg z-20">
                  Slippage defines how much the execution price can move from the
                  quote before your swap reverts.
                </div>
              )}
            </div>

            <div className="relative flex items-center gap-1">
              <div className="flex items-center border border-black rounded-xl bg-slate-900/80 px-2 py-1 h-9">
                <input
                  type="text"
                  value={slipPct}
                  onChange={(e) => handleSlipInputChange(e.target.value)}
                  className="w-16 bg-transparent text-xs text-neutral-50 outline-none text-right"
                />
                <span className="ml-1 text-xs text-neutral-200">%</span>
                <button
                  type="button"
                  onClick={() => setSlipMenuOpen((v) => !v)}
                  className="ml-2 text-[0.625rem] text-neutral-50"
                >
                  ▾
                </button>
              </div>

              {slipMenuOpen && (
                <div className="absolute right-0 mt-1 w-20 rounded-md border border-black bg-slate-900 shadow-lg z-10">
                  {[0.5, 1, 2, 5, 10].map((v) => {
                    const bps = Math.round(v * 100)
                    const active = slipBps === bps
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          setSlipBps(bps)
                          setSlipMenuOpen(false)
                        }}
                        className={
                          "block w-full text-left px-3 py-1.5 text-xs " +
                          (active
                            ? "bg-[var(--secondary)] text-neutral-900"
                            : "bg-slate-900 text-neutral-50 hover:bg-slate-800")
                        }
                      >
                        {v}%
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="text-center text-neutral-200">
          <div>
            Min. out: {fixedDown(formatUnits(minOutWei, toDec), 8)} {toLabel}
          </div>
          <div>Price impact: {(priceImpactBps / 100).toFixed(2)}%</div>
        </div>

        {isRouterSwap && fromAddr && !sameKey && lacksAllowance ? (
          <button
            onClick={approveFrom}
            disabled={isPending}
            className="btn-secondary w-auto mx-auto block"
          >
            Approve {fromLabel}
          </button>
        ) : null}

        <button
          onClick={doSwap}
          disabled={disabled || isRecalcChecking}
          className={
            (disabled || isRecalcChecking ? "btn-primary-wip" : "btn-primary") +
            " md:w-1/2 mx-auto block"
          }
        >
          {isRecalcChecking
            ? "Recalculating price…"
            : isWrap
            ? "Wrap PHRS → WPHRS"
            : isUnwrap
            ? "Unwrap WPHRS → PHRS"
            : `Swap ${fromLabel} → ${toLabel}`}
        </button>
      </div>
    </div>
  )
}