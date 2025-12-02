import { Outlet, NavLink } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useSwitchChain } from 'wagmi'
import { Toaster } from 'react-hot-toast'

const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 0)

export default function App() {
  const { chainId, isConnected } = useAccount()
  const { switchChain } = useSwitchChain()
  const needSwitch = isConnected && chainId !== CHAIN_ID

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `nav-item${isActive ? ' nav-item--active' : ''}`

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 -z-10 bg-[url('/background.webp')] bg-cover bg-center" />

      <div className="min-h-screen grid grid-rows-[56px_1fr]">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 5000,
            className: 'safi-toast',
          }}
        />

        <header className="nav-bar h-14 flex items-center relative">
          <div className="w-full flex justify-center">
            <nav className="nav-list">
              <NavLink to="/"            className={tabClass}>Home</NavLink>
              <NavLink to="/swap"        className={tabClass}>Swap</NavLink>
              <NavLink to="/pool"        className={tabClass}>Pool</NavLink>
              <NavLink to="/stake"       className={tabClass}>Stake</NavLink>
              <NavLink to="/safidoprize" className={tabClass}>SafidoPrize</NavLink>
              <NavLink to="/faucet"      className={tabClass}>Faucet</NavLink>
            </nav>
          </div>

          <div className="absolute right-4 flex items-center">
            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                mounted,
              }) => {
                const ready = mounted
                const connected =
                  ready && account && chain && !chain.unsupported

                if (!ready) {
                  return (
                    <div
                      aria-hidden
                      style={{
                        opacity: 0,
                        pointerEvents: 'none',
                        userSelect: 'none',
                      }}
                    />
                  )
                }

                if (!connected) {
                  return (
                    <button
                      type="button"
                      onClick={openConnectModal}
                      className="wallet-btn"
                    >
                      Connect wallet
                    </button>
                  )
                }

                return (
                  <button
                    type="button"
                    onClick={
                      chain.unsupported ? openChainModal : openAccountModal
                    }
                    className="wallet-btn"
                  >
                    <span className="wallet-dot" />
                    <span className="wallet-label">
                      {account.displayName}
                    </span>
                  </button>
                )
              }}
            </ConnectButton.Custom>
          </div>
        </header>

        <main className="p-6">
          {needSwitch && (
            <div className="mb-3 p-2 border border-yellow-600 bg-yellow-100 text-neutral-900 rounded flex items-center gap-2">
              <span>
                Wrong network. Target chainId: {CHAIN_ID}. Current: {String(chainId)}
              </span>
              <button
                onClick={() => switchChain({ chainId: CHAIN_ID })}
                className="btn btn-secondary w-auto"
              >
                Switch
              </button>
            </div>
          )}

          <div className="page">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
