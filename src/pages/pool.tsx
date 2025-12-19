import { useEffect, useMemo, useState } from "react";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { formatUnits, parseUnits, type Hex } from "viem";
import toast from "react-hot-toast";

import RouterJson from "../abis/Router.json";
import ERC20Json from "../abis/ERC20.json";
import PairJson   from "../abis/Pair.json";
import { ADDR } from "../lib/constants";

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string || "http://localhost:3001").replace(/\/$/, "");

const RouterAbi: any[] = (RouterJson as any).abi ?? (RouterJson as any);
const ERC20Abi:  any[] = (ERC20Json  as any).abi ?? (ERC20Json  as any);
const PairAbi:   any[] = (PairJson   as any).abi ?? (PairJson   as any);

const FactoryAbi = [
  { inputs: [], name: "allPairsLength", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "start", type: "uint256" }, { name: "end", type: "uint256" }], name: "getPairsWithTokens", outputs: [{ type: "address[]" }, { type: "address[]" }, { type: "address[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "tokenA", type: "address" }, { name: "tokenB", type: "address" }], name: "getPair", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "tokenA", type: "address" }, { name: "tokenB", type: "address" }], name: "createPair", outputs: [{ type: "address" }], stateMutability: "nonpayable", type: "function" },
] as const;

const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || "688689") || 688689;

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

type PairItem = {
  pair: `0x${string}`;
  t0: `0x${string}`;
  t1: `0x${string}`;
  sym0: string;
  sym1: string;
  dec0: number;
  dec1: number;
  apr?: number | null;
};

type TokenMeta = { sym: string; dec: number };

const fixedDown = (s: string, dec = 8) => {
  if (!s) return s;
  if (!s.includes(".")) return s;
  const [i, d] = s.split(".");
  return d.length > dec ? `${i}.${d.slice(0, dec)}` : s;
};
const ceilDiv = (a: bigint, b: bigint) => (a + b - 1n) / b;

type Tab = "ADD" | "REMOVE";

export default function Pool() {
  const { address } = useAccount();
  const pub = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();

  const factoryAddr = ADDR.factory as `0x${string}` | undefined;

  const labelToken = (addr: string, sym: string) =>
    addr?.toLowerCase() === ADDR.wphrs.toLowerCase() ? "PHRS" : sym;

  async function loadSymbol(addr: `0x${string}`): Promise<string> {
    if (!addr) return "UNK";
    if (!pub) return labelToken(addr, "UNK");
    try {
      const sym = (await pub.readContract({
        abi: ERC20Abi,
        address: addr,
        functionName: "symbol",
        args: [],
      })) as unknown as string;
      return labelToken(addr, String(sym || "").trim() || "UNK");
    } catch {
      try {
        const nm = (await pub.readContract({
          abi: ERC20Abi,
          address: addr,
          functionName: "name",
          args: [],
        })) as unknown as string;
        return labelToken(addr, String(nm || "").trim() || "UNK");
      } catch {
        return labelToken(addr, "UNK");
      }
    }
  }

  const [pairs, setPairs] = useState<PairItem[]>([]);
  const [loadingPairs, setLoadingPairs] = useState(false);
  
    useEffect(() => {
    try {
      const raw = window.localStorage.getItem("dexPairsSnapshot");
      if (!raw) return;
      const parsed = JSON.parse(raw) as PairItem[];
      if (Array.isArray(parsed) && parsed.length) {
        setPairs(parsed);
      }
    } catch {
    }
  }, []);


async function loadPairs(mounted?: { current: boolean }): Promise<PairItem[]> {
  if (mounted && !mounted.current) return [];
  setLoadingPairs(true);
  try {
    const response = await fetch(`${BACKEND_URL}/dex/pairs`);
    const res = await response.json();
    if (mounted && !mounted.current) return [];
    const snaps = (res.pairs ?? []) as any[];
    if (!snaps.length) {
      if (!mounted || mounted.current) {
        setPairs([]);
      }
      return [];
    }

    const symbolsSeed: Record<string, string> = {};
    const decimalsSeed: Record<string, number> = {};

    for (const p of snaps) {
      const k0 = p.token0.toLowerCase();
      const k1 = p.token1.toLowerCase();

      if (p.symbol0) symbolsSeed[k0] = p.symbol0;
      if (p.symbol1) symbolsSeed[k1] = p.symbol1;

      const d0 = (p as any).decimals0;
      const d1 = (p as any).decimals1;
      if (typeof d0 === "number") decimalsSeed[k0] = d0;
      if (typeof d1 === "number") decimalsSeed[k1] = d1;
    }

    const uniqTokens = Array.from(
      new Set(
        snaps
          .flatMap((p) => [p.token0, p.token1])
          .map((a) => a.toLowerCase()),
      ),
    );

    const meta = new Map<string, TokenMeta>();
    for (const addrLower of uniqTokens) {
      const addr = addrLower as `0x${string}`;
      const seedSym = symbolsSeed[addrLower] || "UNK";
      const dec = decimalsSeed[addrLower] ?? 18;

      meta.set(addrLower, {
        sym: labelToken(addr, seedSym),
        dec,
      });
    }

    const items: PairItem[] = snaps
      .map((p) => {
        const k0 = p.token0.toLowerCase();
        const k1 = p.token1.toLowerCase();
        const m0 = meta.get(k0);
        const m1 = meta.get(k1);
        const r0 = BigInt(p.reserve0);
        const r1 = BigInt(p.reserve1);
        const ts = BigInt(p.totalSupply);
        const hasLiq = r0 > 0n && r1 > 0n && ts > 0n;

        return {
          hasLiq,
          item: {
            pair: p.pair as `0x${string}`,
            t0: p.token0 as `0x${string}`,
            t1: p.token1 as `0x${string}`,
            sym0: m0?.sym ?? labelToken(p.token0, "T0"),
            sym1: m1?.sym ?? labelToken(p.token1, "T1"),
            dec0: m0?.dec ?? 18,
            dec1: m1?.dec ?? 18,
            apr: typeof p.apr === "number" ? p.apr : null,
          } satisfies PairItem,
        };
      })
      .filter((x) => x.hasLiq)
      .map((x) => x.item);

    if (!mounted || mounted.current) {
      setPairs(items);
      try {
        window.localStorage.setItem("dexPairsSnapshot", JSON.stringify(items));
      } catch {
      }
    }
    return items;
  } finally {
    if (!mounted || mounted.current) {
      setLoadingPairs(false);
    }
  }
}

	useEffect(() => {
	  const mounted = { current: true };
	  loadPairs(mounted).catch(() => {});
	  return () => {
		mounted.current = false;
	  };
	}, [pub]);

  useEffect(() => {
    if (!pairs.length) return;
    const hasUnknown = pairs.some((p) => p.sym0 === "UNK" || p.sym1 === "UNK");
    if (!hasUnknown) return;

    let cancelled = false;
    let attempts = 0;
    let id: ReturnType<typeof setInterval> | undefined;

    const refresh = async () => {
      if (cancelled) return;
      attempts += 1;

      const tokenKeys = Array.from(
        new Set(
          pairs
            .flatMap((p) => [
              p.sym0 === "UNK" ? p.t0.toLowerCase() : null,
              p.sym1 === "UNK" ? p.t1.toLowerCase() : null,
            ])
            .filter((x): x is string => !!x),
        ),
      );

      if (!tokenKeys.length) {
        cancelled = true;
        if (id) clearInterval(id);
        return;
      }

      const updates = new Map<string, string>();
      for (const tk of tokenKeys) {
        try {
          const sym = await loadSymbol(tk as `0x${string}`);
          if (sym && sym !== "UNK") {
            updates.set(tk, sym);
          }
        } catch {
        }
      }

      if (cancelled) return;

      if (updates.size) {
        setPairs((prev) =>
          prev.map((p) => {
            let sym0 = p.sym0;
            let sym1 = p.sym1;
            const k0 = p.t0.toLowerCase();
            const k1 = p.t1.toLowerCase();

            if (sym0 === "UNK") {
              const s = updates.get(k0);
              if (s) sym0 = s;
            }
            if (sym1 === "UNK") {
              const s = updates.get(k1);
              if (s) sym1 = s;
            }

            if (sym0 === p.sym0 && sym1 === p.sym1) return p;
            return { ...p, sym0, sym1 };
          }),
        );
      }

      if (attempts >= 3) {
        cancelled = true;
        if (id) clearInterval(id);
      }
    };

    void refresh();
    id = setInterval(refresh, 40000);

    return () => {
      cancelled = true;
      if (id) clearInterval(id);
    };
  }, [pairs]);

  const [selected, setSelected] = useState<PairItem | null>(null);
  const [apr, setApr] = useState<number | null>(null);
  const [pairOpen, setPairOpen] = useState(false);
  const [isApprovingLP, setIsApprovingLP] = useState(false);
  const [lpRecentlyApproved, setLpRecentlyApproved] = useState(false);
  
  useEffect(() => {
    if (!selected && pairs.length > 0) {
      setSelected(pairs[0]);
    }
  }, [pairs, selected]);

  useEffect(() => {
    if (!selected) {
      setApr(null);
      return;
    }
    setApr(typeof selected.apr === "number" ? selected.apr : null);
  }, [selected]);

	const isPhrsPair = useMemo(() => {
	  if (!selected) return false;
	  return (
		selected.t0.toLowerCase() === ADDR.wphrs.toLowerCase() ||
		selected.t1.toLowerCase() === ADDR.wphrs.toLowerCase()
	  );
	}, [selected]);


  const tokenA = selected?.t0;
  const tokenB = selected?.t1;
  const decA = selected?.dec0 ?? 18;
  const decB = selected?.dec1 ?? 18;
  const symA = selected?.sym0 ?? "A";
  const symB = selected?.sym1 ?? "B";

  const selectedLabel = useMemo(() => {
    if (!selected) return "";
    const v = typeof selected.apr === "number" ? selected.apr : null;
    if (v != null) return `${selected.sym0}/${selected.sym1} (${v.toFixed(2)}%)`;
    return `${selected.sym0}/${selected.sym1}`;
  }, [selected]);

  const needApproveFor = (amt: bigint, allowance?: bigint) =>
    amt > 0n && ((allowance ?? 0n) < amt);

  const { data: allowanceA } = useReadContract({
    abi: ERC20Abi,
    address: tokenA,
    functionName: "allowance",
    args: address && tokenA ? [address, ADDR.router as `0x${string}`] : undefined,
    query: { enabled: !!address && !!tokenA },
  });
  const { data: allowanceB } = useReadContract({
    abi: ERC20Abi,
    address: tokenB,
    functionName: "allowance",
    args: address && tokenB ? [address, ADDR.router as `0x${string}`] : undefined,
    query: { enabled: !!address && !!tokenB },
  });

  const { data: lpAllowance } = useReadContract({
    abi: ERC20Abi,
    address: selected?.pair,
    functionName: "allowance",
    args: address && selected?.pair ? [address, ADDR.router as `0x${string}`] : undefined,
    query: { enabled: !!address && !!selected?.pair },
  });

  async function approveToken(token: `0x${string}`) {
    if (!address || !ADDR.router) return;
    if (!pub) {
      toast.error("Network not ready");
      return;
    }
    try {
      const tx = await writeContractAsync({
        chainId: CHAIN_ID,
        abi: ERC20Abi,
        address: token,
        functionName: "approve",
        args: [ADDR.router as `0x${string}`, (2n ** 255n) - 1n],
      });
      toast.loading("Approving token…", { id: "tx-approve" });
      await pub.waitForTransactionReceipt({ hash: tx as Hex });
      toast.success("Token approved", { id: "tx-approve" });
    } catch (err: any) {
      toast.error(err?.shortMessage || "Approve failed");
    }
  }

async function approveLP() {
  if (!address || !ADDR.router || !selected) return;
  if (!pub) {
    toast.error("Network not ready");
    return;
  }
  try {
    setIsApprovingLP(true);

    const tx = await writeContractAsync({
      chainId: CHAIN_ID,
      abi: ERC20Abi,
      address: selected.pair,
      functionName: "approve",
      args: [ADDR.router as `0x${string}`, (2n ** 255n) - 1n],
    });

    const hash = tx as Hex;
    showTxToast(hash);
    await pub.waitForTransactionReceipt({ hash });

    setTimeout(() => {
      setIsApprovingLP(false);
      setLpRecentlyApproved(true);
    }, 1200);
  } catch (err: any) {
    setIsApprovingLP(false);
    toast.error(err?.shortMessage || "Approve LP failed");
  }
}

  const [tab, setTab] = useState<Tab>("ADD");
  const [aIn, setAIn] = useState("");
  const [bIn, setBIn] = useState("");
  const [editAdd, setEditAdd] = useState<"A" | "B" | null>(null);
  const [remA, setRemA] = useState("");
  const [remB, setRemB] = useState("");
  const [editRem, setEditRem] = useState<"A" | "B" | null>(null);
  const [debouncedAIn, setDebouncedAIn] = useState("");
  const [debouncedBIn, setDebouncedBIn] = useState("");
  const [debouncedRemA, setDebouncedRemA] = useState("");
  const [debouncedRemB, setDebouncedRemB] = useState("");
  
  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedAIn(aIn);
    }, 300);
    return () => window.clearTimeout(id);
  }, [aIn]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedBIn(bIn);
    }, 300);
    return () => window.clearTimeout(id);
  }, [bIn]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedRemA(remA);
    }, 300);
    return () => window.clearTimeout(id);
  }, [remA]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedRemB(remB);
    }, 300);
    return () => window.clearTimeout(id);
  }, [remB]);
  
  const aAmt = useMemo(
    () => {
      try { return debouncedAIn ? parseUnits(debouncedAIn, decA) : 0n; }
      catch { return 0n; }
    },
    [debouncedAIn, decA],
  );

  const bAmt = useMemo(
    () => {
      try { return debouncedBIn ? parseUnits(debouncedBIn, decB) : 0n; }
      catch { return 0n; }
    },
    [debouncedBIn, decB],
  );

  const remA_amt = useMemo(
    () => {
      try { return debouncedRemA ? parseUnits(debouncedRemA, decA) : 0n; }
      catch { return 0n; }
    },
    [debouncedRemA, decA],
  );

  const remB_amt = useMemo(
    () => {
      try { return debouncedRemB ? parseUnits(debouncedRemB, decB) : 0n; }
      catch { return 0n; }
    },
    [debouncedRemB, decB],
  );

  const { data: reserves, refetch: refetchReserves } = useReadContract({
    abi: PairAbi,
    address: selected?.pair,
    functionName: "getReserves",
    query: { enabled: !!selected?.pair },
  });

  const r = useMemo(() => {
    if (!reserves) return { rA: 0n, rB: 0n };
    const [ra, rb] = reserves as unknown as [bigint, bigint, number];
    return { rA: ra, rB: rb };
  }, [reserves]);

  const { data: totalSupply, refetch: refetchTotalSupply } = useReadContract({
    abi: PairAbi,
    address: selected?.pair,
    functionName: "totalSupply",
    query: { enabled: !!selected?.pair },
  });

  const { data: lpBal, refetch: refetchLpBal } = useReadContract({
    abi: ERC20Abi,
    address: selected?.pair,
    functionName: "balanceOf",
    args: address && selected?.pair ? [address] : undefined,
    query: { enabled: !!address && !!selected?.pair },
  });

  useEffect(() => {
    if (!selected) return;
    if (editAdd !== "A") return;
    if (!aIn) { setBIn(""); return; }
    if (r.rA === 0n || r.rB === 0n) return;
    if (!debouncedAIn) return;

    try {
      const aWei = parseUnits(debouncedAIn, decA);
      const bWei = (aWei * r.rB) / r.rA;
      setBIn(fixedDown(formatUnits(bWei, decB), 8));
    } catch {
    }
  }, [editAdd, aIn, debouncedAIn, selected, r.rA, r.rB, decA, decB]);

  useEffect(() => {
    if (!selected) return;
    if (editAdd !== "B") return;
    if (!bIn) { setAIn(""); return; }
    if (r.rA === 0n || r.rB === 0n) return;
    if (!debouncedBIn) return;

    try {
      const bWei = parseUnits(debouncedBIn, decB);
      const aWei = (bWei * r.rA) / r.rB;
      setAIn(fixedDown(formatUnits(aWei, decA), 8));
    } catch {
    }
  }, [editAdd, bIn, debouncedBIn, selected, r.rA, r.rB, decA, decB]);

  useEffect(() => {
    if (!selected) return;
    if (editRem !== "A") return;
    if (!remA) { setRemB(""); return; }
    if (r.rA === 0n || r.rB === 0n) return;
    if (!debouncedRemA) return;

    try {
      const aWei = parseUnits(debouncedRemA, decA);
      const bWei = (aWei * r.rB) / r.rA;
      setRemB(fixedDown(formatUnits(bWei, decB), 8));
    } catch {
    }
  }, [editRem, remA, debouncedRemA, selected, r.rA, r.rB, decA, decB]);

  useEffect(() => {
    if (!selected) return;
    if (editRem !== "B") return;
    if (!remB) { setRemA(""); return; }
    if (r.rA === 0n || r.rB === 0n) return;
    if (!debouncedRemB) return;

    try {
      const bWei = parseUnits(debouncedRemB, decB);
      const aWei = (bWei * r.rA) / r.rB;
      setRemA(fixedDown(formatUnits(aWei, decA), 8));
    } catch {
    }
  }, [editRem, remB, debouncedRemB, selected, r.rA, r.rB, decA, decB]);

  const maxOut = useMemo(() => {
    if (!lpBal || !totalSupply || r.rA === 0n || r.rB === 0n) {
      return { a: "0", b: "0" };
    }
    const lp = lpBal as unknown as bigint;
    const ts = totalSupply as unknown as bigint;
    const aOut = (r.rA * lp) / ts;
    const bOut = (r.rB * lp) / ts;
    return {
      a: fixedDown(formatUnits(aOut, decA), 8) || "0",
      b: fixedDown(formatUnits(bOut, decB), 8) || "0",
    };
  }, [lpBal, totalSupply, r.rA, r.rB, decA, decB]);

  const liqNeeded = useMemo(() => {
    if (!totalSupply || r.rA === 0n || r.rB === 0n) return 0n;
    if (remA_amt === 0n && remB_amt === 0n) return 0n;

    const ts = totalSupply as unknown as bigint;
    const lpFromA = remA_amt > 0n ? ceilDiv(remA_amt * ts, r.rA) : 0n;
    const lpFromB = remB_amt > 0n ? ceilDiv(remB_amt * ts, r.rB) : 0n;

    if (lpFromA === 0n) return lpFromB;
    if (lpFromB === 0n) return lpFromA;
    return lpFromA < lpFromB ? lpFromA : lpFromB;
  }, [totalSupply, r.rA, r.rB, remA_amt, remB_amt]);

  const rAHuman = useMemo(
    () => fixedDown(formatUnits(r.rA, decA), 8),
    [r.rA, decA],
  );
  const rBHuman = useMemo(
    () => fixedDown(formatUnits(r.rB, decB), 8),
    [r.rB, decB],
  );
  const lpHuman = useMemo(
    () => (lpBal ? fixedDown(formatUnits(lpBal as unknown as bigint, 18), 8) : "0"),
    [lpBal],
  );
  const sharePct = useMemo(() => {
    if (!lpBal || !totalSupply) return "0.000000";
    const P = 1_000_000n;
    const pctScaled =
      ((lpBal as unknown as bigint) * 100n * P) / (totalSupply as unknown as bigint);
    return (Number(pctScaled) / 1_000_000).toFixed(6);
  }, [lpBal, totalSupply]);

  const addDisabled =
    isPending || aAmt === 0n || bAmt === 0n || !selected;
  const remDisabled =
    isPending ||
    liqNeeded === 0n ||
    ((lpBal != null ? (lpBal as unknown as bigint) : 0n) < liqNeeded) ||
    r.rA === 0n ||
    r.rB === 0n ||
    !selected;
	
  const needsLpApproval =
    liqNeeded > 0n &&
    ((lpAllowance != null ? (lpAllowance as unknown as bigint) : 0n) < liqNeeded) &&
    !lpRecentlyApproved;

  const { data: balA_erc20 } = useReadContract({
    abi: ERC20Abi,
    address: tokenA,
    functionName: "balanceOf",
    args: address && tokenA ? [address] : undefined,
    query: { enabled: !!address && !!tokenA },
  });
  const { data: balB_erc20 } = useReadContract({
    abi: ERC20Abi,
    address: tokenB,
    functionName: "balanceOf",
    args: address && tokenB ? [address] : undefined,
    query: { enabled: !!address && !!tokenB },
  });
  const [phrsBal, setPhrsBal] = useState<bigint>(0n);
  useEffect(() => {
    let cancelled = false;

    if (!address || !pub) {
      setPhrsBal(0n);
      return () => {
        cancelled = true;
      };
    }

    pub
      .getBalance({ address })
      .then((v) => {
        if (!cancelled) setPhrsBal(v);
      })
      .catch(() => {
        if (!cancelled) setPhrsBal(0n);
      });

    return () => {
      cancelled = true;
    };
  }, [address, selected, pub]);

  const balAHuman = useMemo(() => {
    if (
      tokenA &&
      tokenA.toLowerCase() === ADDR.wphrs?.toLowerCase()
    )
      return fixedDown(formatUnits(phrsBal, 18), 8);
    return balA_erc20 != null
      ? fixedDown(formatUnits(balA_erc20 as unknown as bigint, decA), 8)
      : "0";
  }, [tokenA, phrsBal, balA_erc20, decA]);
  const balBHuman = useMemo(() => {
    if (
      tokenB &&
      tokenB.toLowerCase() === ADDR.wphrs?.toLowerCase()
    )
      return fixedDown(formatUnits(phrsBal, 18), 8);
    return balB_erc20 != null
      ? fixedDown(formatUnits(balB_erc20 as unknown as bigint, decB), 8)
      : "0";
  }, [tokenB, phrsBal, balB_erc20, decB]);

  const [newB, setNewB] = useState("");
  const [amtA0, setAmtA0] = useState("");
  const [amtB0, setAmtB0] = useState("");
  const [metaB, setMetaB] = useState<TokenMeta | null>(null);

  useEffect(() => {
    setMetaB(null);
    if (!newB || !newB.startsWith("0x") || newB.length !== 42) return;
    if (!pub) return;
    const addr = newB as `0x${string}`;
    (async () => {
      try {
        const [sym, dec] = await Promise.all([
          loadSymbol(addr),
          pub
            .readContract({
              abi: ERC20Abi,
              address: addr,
              functionName: "decimals",
              args: [],
            })
            .catch(() => 18),
        ]);
        setMetaB({ sym: String(sym), dec: Number(dec) });
      } catch {
        setMetaB(null);
      }
    })();
  }, [newB, pub]);

  function sort2(a: string, b: string): [string, string] {
    return a.toLowerCase() < b.toLowerCase() ? [a, b] : [b, a];
  }

  async function refreshSelected() {
    if (!selected) return;
    try {
      await Promise.all([
        refetchReserves(),
        refetchTotalSupply(),
        refetchLpBal(),
      ]);
    } catch {
    }
  }


  async function createAndSeedPair() {
    if (!factoryAddr || !newB) return;
    if (!pub) {
      toast.error("Network not ready");
      return;
    }
    if (newB.toLowerCase() === ADDR.wphrs?.toLowerCase()) {
      toast.error("Token B cannot be PHRS");
      return;
    }

    try {
      const tx1 = await writeContractAsync({
        chainId: CHAIN_ID,
        abi: FactoryAbi,
        address: factoryAddr as `0x${string}`,
        functionName: "createPair",
        args: [ADDR.wphrs as `0x${string}`, newB as `0x${string}`],
      });

      const hash1 = tx1 as Hex;
      showTxToast(hash1);
      await pub.waitForTransactionReceipt({ hash: hash1 });

      const [s0, s1] = sort2(ADDR.wphrs as string, newB);
      const newPair = (await pub.readContract({
        abi: FactoryAbi,
        address: factoryAddr as `0x${string}`,
        functionName: "getPair",
        args: [s0 as `0x${string}`, s1 as `0x${string}`],
      })) as `0x${string}`;

      const list = await loadPairs();
      const found = list.find(
        (p) => p.pair.toLowerCase() === newPair.toLowerCase(),
      );
      if (found) {
        setSelected(found);
        await refreshSelected();
      }

      const dB = metaB?.dec ?? 18;
      const phrsWei = amtA0 ? parseUnits(amtA0, 18) : 0n;
      const tokenWei = amtB0 ? parseUnits(amtB0, dB) : 0n;

      if (phrsWei > 0n && tokenWei > 0n) {
        const tx2 = await writeContractAsync({
          chainId: CHAIN_ID,
          abi: RouterAbi,
          address: ADDR.router as `0x${string}`,
          functionName: "addLiquidityPHRS",
          args: [
            newB as `0x${string}`,
            tokenWei,
          ],
          value: phrsWei,
        });
        const hash2 = tx2 as Hex;
        showTxToast(hash2);
        await pub.waitForTransactionReceipt({ hash: hash2 });
      }

      setAmtA0("");
      setAmtB0("");
    } catch (err: any) {
      toast.error(err?.shortMessage || "Create pair failed");
    }
  }

async function addLiquidity() {
  if (!selected || !ADDR.router || !address) return;
  if (aAmt === 0n || bAmt === 0n) return;
  if (!pub) {
    toast.error("Network not ready");
    return;
  }

  try {
    const [t0, t1] = [selected.t0, selected.t1];
    const w = ADDR.wphrs.toLowerCase();

    let tx: Hex | string;

    if (
      t0.toLowerCase() === w ||
      t1.toLowerCase() === w
    ) {
      const phrsIsA = t0.toLowerCase() === w;
      const phrsAmt = phrsIsA ? aAmt : bAmt;
      const tokenAmt = phrsIsA ? bAmt : aAmt;
      const tokenAddr = phrsIsA ? t1 : t0;

      tx = await writeContractAsync({
        chainId: CHAIN_ID,
        abi: RouterAbi,
        address: ADDR.router as `0x${string}`,
        functionName: "addLiquidityPHRS",
        args: [tokenAddr, tokenAmt],
        value: phrsAmt,
      });
    } else {
      tx = await writeContractAsync({
        chainId: CHAIN_ID,
        abi: RouterAbi,
        address: ADDR.router as `0x${string}`,
        functionName: "addLiquidity",
        args: [t0, t1, aAmt, bAmt],
      });
    }

    const hash = tx as Hex;
    showTxToast(hash);
    await pub.waitForTransactionReceipt({ hash });

    await refreshSelected();
    setAIn("");
    setBIn("");
  } catch (err: any) {
    toast.error(err?.shortMessage || "Add liquidity failed");
  }
}

async function removeLiquidity() {
  if (!selected || !ADDR.router || !address) return;
  if (liqNeeded === 0n) return;
  if (!pub) {
    toast.error("Network not ready");
    return;
  }

  try {
    const [t0, t1] = [selected.t0, selected.t1];
    const w = ADDR.wphrs.toLowerCase();

    let tx: Hex | string;

    if (t0.toLowerCase() === w || t1.toLowerCase() === w) {
      const tokenAddr = t0.toLowerCase() === w ? t1 : t0;

      tx = await writeContractAsync({
        chainId: CHAIN_ID,
        abi: RouterAbi,
        address: ADDR.router as `0x${string}`,
        functionName: "removeLiquidityPHRS",
        args: [tokenAddr, liqNeeded],
      });
    } else {
      tx = await writeContractAsync({
        chainId: CHAIN_ID,
        abi: RouterAbi,
        address: ADDR.router as `0x${string}`,
        functionName: "removeLiquidity",
        args: [t0, t1, liqNeeded],
      });
    }

    const hash = tx as Hex;
    showTxToast(hash);
    await pub.waitForTransactionReceipt({ hash });

    setTimeout(() => {
      setLpRecentlyApproved(true);
    }, 1200);

    await refreshSelected();

    setRemA("");
    setRemB("");
  } catch (err: any) {
    setIsApprovingLP(false);
    toast.error(err?.shortMessage || "Remove liquidity failed");
  }
}

  return (
    <div className="page-card space-y-6">
      <div className="w-full max-w-md mx-auto space-y-4">
<div className="panel-card space-y-4">
  <div className="flex items-center justify-between gap-3">
    <div className="flex flex-col gap-1">
      <div className="toggle-group">
        <button
          type="button"
          className={
            tab === "ADD"
              ? "btn-primary w-auto"
              : "btn-primary-wip w-auto"
          }
          onClick={() => setTab("ADD")}
        >
          Add
        </button>
        <button
          type="button"
          className={
            tab === "REMOVE"
              ? "btn-primary w-auto"
              : "btn-primary-wip w-auto"
          }
          onClick={() => setTab("REMOVE")}
        >
          Remove
        </button>
      </div>
    </div>

    <div className="flex items-center gap-2">
      <span className="text-sm">Pair</span>

      <div
        className="relative min-w-[9.375rem] text-[0.75rem]"
        onMouseEnter={() => {
          setPairOpen(true);
          if (!pairs.length && !loadingPairs) {
            void loadPairs();
          }
        }}
        onMouseLeave={() => setPairOpen(false)}
      >
        <button
          type="button"
          className="input-type flex items-center justify-between w-full cursor-pointer"
        >
          <span className="truncate">
            {selectedLabel || "Select pair"}
          </span>
          <span className="ml-2 text-xs">▾</span>
        </button>

        {pairOpen && (
          <div className="dropdown-menu">
            {loadingPairs && !pairs.length ? (
              <div className="flex items-center justify-center py-2 text-xs text-white">
                <span className="mr-2 inline-block h-3 w-3 rounded-full border border-white border-t-transparent animate-spin" />
                Loading pairs...
              </div>
            ) : pairs.length > 0 ? (
              pairs.map((p) => {
                const v = typeof p.apr === "number" ? p.apr : null;
                const label =
                  v != null
                    ? `${p.sym0}/${p.sym1} (${v.toFixed(2)}%)`
                    : `${p.sym0}/${p.sym1}`;

                return (
                  <button
                    type="button"
                    key={p.pair}
                    className="dropdown-option"
                    onClick={() => {
                      setSelected(p);
                      setPairOpen(false);
                    }}
                  >
                    {label}
                  </button>
                );
              })
            ) : (
              <div className="py-2 text-xs text-white text-center">
                No pairs available
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  </div>

{tab === "ADD" ? (
  <section className="space-y-3">

    <div className="space-y-2">
      <label className="block text-sm">
        {symA}{" "}
        <span className="text-xs text-gray-600">
          • Available: {balAHuman}
        </span>
      </label>
      <div className="flex items-center gap-2">
        <input
          className="input-type"
          value={aIn}
          onFocus={() => setEditAdd("A")}
          onChange={(e) => {
            setEditAdd("A");
            setAIn(fixedDown(e.target.value, 8));
          }}
          placeholder="0.0"
          inputMode="decimal"
        />
        <button
          type="button"
          onClick={() => {
            setEditAdd("A");
            setAIn(fixedDown(balAHuman, 8));
          }}
          className="btn-secondary w-auto text-xs px-3 py-1"
        >
          Max {symA}
        </button>
      </div>
      {selected && tokenA &&
	  !isPhrsPair &&
      needApproveFor(aAmt, allowanceA as unknown as bigint) ? (
        <button
          type="button"
          onClick={() => approveToken(tokenA)}
          disabled={isPending}
          className="btn-secondary w-auto text-xs px-3 py-1"
        >
          Approve {symA}
        </button>
      ) : null}
      {selected && tokenA &&
	  isPhrsPair &&
      selected.t0.toLowerCase() !== ADDR.wphrs?.toLowerCase() &&
      needApproveFor(aAmt, allowanceA as unknown as bigint) ? (
        <button
          type="button"
          onClick={() => approveToken(tokenA)}
          disabled={isPending}
          className="btn-secondary w-auto text-xs px-3 py-1"
        >
          Approve {symA}
        </button>
      ) : null}
    </div>

    <div className="space-y-2">
      <label className="block text-sm">
        {symB}{" "}
        <span className="text-xs text-gray-600">
          • Available: {balBHuman}
        </span>
      </label>
      <div className="flex items-center gap-2">
        <input
          className="input-type"
          value={bIn}
          onFocus={() => setEditAdd("B")}
          onChange={(e) => {
            setEditAdd("B");
            setBIn(fixedDown(e.target.value, 8));
          }}
          placeholder="0.0"
          inputMode="decimal"
        />
        <button
          type="button"
          onClick={() => {
            setEditAdd("B");
            setBIn(fixedDown(balBHuman, 8));
          }}
          className="btn-secondary w-auto text-xs px-3 py-1"
        >
          Max {symB}
        </button>
      </div>
      {selected && tokenB &&
	  !isPhrsPair &&
      needApproveFor(bAmt, allowanceB as unknown as bigint) ? (
        <button
          type="button"
          onClick={() => approveToken(tokenB)}
          disabled={isPending}
          className="btn-secondary w-auto text-xs px-3 py-1"
        >
          Approve {symB}
        </button>
      ) : null}
      {selected && tokenB &&
	  isPhrsPair &&
      selected.t1.toLowerCase() !== ADDR.wphrs?.toLowerCase() &&
      needApproveFor(bAmt, allowanceB as unknown as bigint) ? (
        <button
          type="button"
          onClick={() => approveToken(tokenB)}
          disabled={isPending}
          className="btn-secondary w-auto text-xs px-3 py-1"
        >
          Approve {symB}
        </button>
      ) : null}
    </div>

    <button
      type="button"
      onClick={addLiquidity}
      disabled={addDisabled}
      className={addDisabled ? "btn-primary-wip" : "btn-primary"}
    >
      Add Liquidity ({symA} + {symB})
    </button>
  </section>
) : (
            <section className="space-y-3">
              <div className="text-xs text-gray-600">
                Max you can receive ~ {maxOut.a} {symA} and {maxOut.b} {symB}
              </div>

              <div className="space-y-2">
                <label className="block text-sm">{symA}</label>
                <div className="flex items-center gap-2">
                  <input
                    className="input-type"
                    value={remA}
                    onFocus={() => setEditRem("A")}
                    onChange={(e) => {
                      setEditRem("A");
                      setRemA(fixedDown(e.target.value, 8));
                    }}
                    placeholder="0.0"
                    inputMode="decimal"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setEditRem("A");
                      setRemA(fixedDown(maxOut.a, 8));
                    }}
                    className="btn-secondary w-auto text-xs px-3 py-1"
                  >
                    Max {symA}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm">{symB}</label>
                <div className="flex items-center gap-2">
                  <input
                    className="input-type"
                    value={remB}
                    onFocus={() => setEditRem("B")}
                    onChange={(e) => {
                      setEditRem("B");
                      setRemB(fixedDown(e.target.value, 8));
                    }}
                    placeholder="0.0"
                    inputMode="decimal"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setEditRem("B");
                      setRemB(fixedDown(maxOut.b, 8));
                    }}
                    className="btn-secondary w-auto text-xs px-3 py-1"
                  >
                    Max {symB}
                  </button>
                </div>
              </div>

              {needsLpApproval ? (
                <button
                  type="button"
                  onClick={approveLP}
                  disabled={isPending || isApprovingLP}
                  className={
                    isApprovingLP ? "btn-primary-wip" : "btn-primary"
                  }
                >
                  {isApprovingLP ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-full border border-white border-t-transparent animate-spin" />
                      Waiting approval
                    </span>
                  ) : (
                    "Approve LP"
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={removeLiquidity}
                  disabled={remDisabled}
                  className={
                    remDisabled ? "btn-primary-wip" : "btn-primary"
                  }
                >
                  Remove liquidity
                </button>
              )}
              <div className="text-xs text-gray-600">
                Your LP: {lpHuman}
              </div>
            </section>
          )}

          <section className="space-y-1 text-xs text-gray-400">
		{selected && (
		  <>
			<div>
			  Reserves: {rAHuman} {symA} | {rBHuman} {symB}
			</div>
			<div>Your LP: {lpHuman}</div>
			<div>Your share: {sharePct}%</div>
			{apr != null ? (
			  <div>Estimated APR: {apr.toFixed(2)}%</div>
			) : (
			  <div>Estimated APR: N/A</div>
			)}
		  </>
		)}
          </section>
        </div>

        <div className="panel-card space-y-3">
          <h3 className="text-lg font-semibold text-center">
            Create pair
          </h3>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs flex items-center gap-2">
                <span>Token A</span>
                <div className="group relative inline-flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full border border-neutral-400 text-[0.625rem] flex items-center justify-center opacity-80 cursor-default">
                    i
                    <div className="pointer-events-none absolute top-1/2 -translate-y-1/2 -mt-1 left-full ml-3 hidden group-hover:block rounded-md border border-[var(--primary)] bg-slate-900/95 px-4 py-2 text-[11px] text-neutral-100 shadow-lg whitespace-nowrap text-left">
                      Token A will always be PHRS. The pair will be between PHRS and token B.
                    </div>
                  </div>
                </div>
              </label>
              <input className="input-type-lg" value="PHRS" disabled />
            </div>
            <div>
              <label className="block text-xs">
                Initial amount A
              </label>
              <input
                className="input-type-lg"
                placeholder="0.0"
                inputMode="decimal"
                value={amtA0}
                onChange={(e) =>
                  setAmtA0(fixedDown(e.target.value, 8))
                }
              />
            </div>

            <div>
              <label className="block text-xs">
                Token B
              </label>
              <input
                className="input-type-lg"
                placeholder="0x..."
                value={newB}
                onChange={(e) => setNewB(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs">
                Initial amount B
              </label>
              <input
                className="input-type-lg"
                placeholder="0.0"
                inputMode="decimal"
                value={amtB0}
                onChange={(e) =>
                  setAmtB0(fixedDown(e.target.value, 8))
                }
              />
            </div>
          </div>

          <button
            type="button"
            className="btn-primary mt-1"
            onClick={createAndSeedPair}
            disabled={!factoryAddr || !newB || isPending}
          >
            Create new pair
          </button>
        </div>
      </div>
    </div>
  );
}