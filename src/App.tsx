import { Outlet, NavLink } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useSwitchChain } from 'wagmi'
import { Toaster } from 'react-hot-toast'
import Footer from './components/Footer'

const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 0)

export default function App() {
  const { chainId, isConnected } = useAccount()
  const { switchChain } = useSwitchChain()
  const needSwitch = isConnected && chainId !== CHAIN_ID

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `nav-item whitespace-nowrap px-3 py-1 ${isActive ? 'nav-item--active' : ''}`

  return (
    <div className="relative min-h-screen flex flex-col">
      <div className="fixed inset-0 -z-10 bg-[url('/background.webp')] bg-cover bg-center" />

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 5000,
          className: 'safi-toast',
        }}
      />

      <header className="nav-bar h-16 px-4 flex items-center relative sticky top-0 z-50 backdrop-blur-md bg-black/20 border-b border-white/10">
        
        <div className="flex-1 md:flex-none flex items-center justify-start overflow-x-auto no-scrollbar mask-gradient md:absolute md:left-1/2 md:-translate-x-1/2">
          <nav className="nav-list flex items-center gap-2 pr-4 md:pr-0">
            <NavLink to="/"            className={tabClass}>Home</NavLink>
            <NavLink to="/swap"        className={tabClass}>Swap</NavLink>
            <NavLink to="/pool"        className={tabClass}>Pool</NavLink>
            <NavLink to="/stake"       className={tabClass}>Stake</NavLink>
            <NavLink to="/safidoprize" className={tabClass}>SafidoPrize</NavLink>
            <NavLink to="/faucet"      className={tabClass}>Faucet</NavLink>
          </nav>
        </div>

        <div className="flex-shrink-0 ml-auto relative z-10">
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
                    className="wallet-btn text-sm px-3 py-2"
                  >
                    Connect
                  </button>
                )
              }

              return (
                <button
                  type="button"
                  onClick={
                    chain.unsupported ? openChainModal : openAccountModal
                  }
                  className="wallet-btn flex items-center gap-2 text-sm px-3 py-2"
                >
                  <span className="wallet-dot w-2 h-2 rounded-full bg-green-500" />
                  <span className="wallet-label hidden sm:inline-block font-medium">
                    {account.displayName}
                  </span>
                </button>
              )
            }}
          </ConnectButton.Custom>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {needSwitch && (
          <div className="mb-4 p-3 border border-yellow-600/50 bg-yellow-900/20 text-yellow-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-sm backdrop-blur-sm">
            <span>
              Wrong network. Target: <b>{CHAIN_ID}</b>. Current: <b>{String(chainId)}</b>
            </span>
            <button
              onClick={() => switchChain({ chainId: CHAIN_ID })}
              className="btn-secondary px-4 py-1 text-xs uppercase font-bold tracking-wider"
            >
              Switch Network
            </button>
          </div>
        )}

        <div className="page fade-in">
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  )
}