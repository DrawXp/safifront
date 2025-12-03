const BK =
  ((import.meta.env.VITE_BACKEND_URL as string) || "").replace(/\/+$/, "") ||
  "http://localhost:3001"

async function getJson<T = any>(path: string): Promise<T> {
  const r = await fetch(`${BK}${path}`)
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
  return r.json() as Promise<T>
}

async function postJson<T = any>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${BK}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
  return r.json() as Promise<T>
}

export type DexPairSnapshot = {
  pair: string
  token0: string
  token1: string
  reserve0: string
  reserve1: string
  totalSupply: string
  symbol0?: string
  symbol1?: string
  decimals0?: number
  decimals1?: number
}

export type DexPairsResponse = {
  pairs: DexPairSnapshot[]
}

export const api = {
  health: () => getJson(`/health`),

  dexPairs: () =>
    getJson<DexPairsResponse>(`/dex/pairs`),

  bountyHint: (txHash: string) => postJson(`/bounty/hint`, { hash: txHash }),
}