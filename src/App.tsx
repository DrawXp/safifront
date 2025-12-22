import { Outlet } from 'react-router-dom'
import { useAccount, useSwitchChain } from 'wagmi'
import { Toaster } from 'react-hot-toast'
import Footer from './components/footer'
import Navbar from './components/navbar'

const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 0)

export default function App() {
  const { chainId, isConnected } = useAccount()
  const { switchChain } = useSwitchChain()
  const needSwitch = isConnected && chainId !== CHAIN_ID

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

      <Navbar />

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