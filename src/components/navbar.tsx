import { NavLink } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useRef, useState, useEffect } from 'react'

export default function Navbar() {
  const navRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = () => {
    if (navRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = navRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 2)
    }
  }

  useEffect(() => {
    checkScroll()
    window.addEventListener('resize', checkScroll)
    return () => window.removeEventListener('resize', checkScroll)
  }, [])

  const scrollLeft = () => {
    if (navRef.current) {
      navRef.current.scrollBy({ left: -150, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (navRef.current) {
      navRef.current.scrollBy({ left: 150, behavior: 'smooth' })
    }
  }

  const getNavLinkClass = ({ isActive }: { isActive: boolean }) => {
    const base = "relative px-4 py-2 text-sm font-semibold transition-all duration-300 rounded-xl whitespace-nowrap"
    const active = "text-cyan-400 bg-cyan-500/10 shadow-[0_0_15px_rgba(34,211,238,0.2)] border border-cyan-500/20"
    const inactive = "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
    
    return `${base} ${isActive ? active : inactive}`
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0a101d]/70 backdrop-blur-xl">
      <div className="mx-auto flex h-20 items-center justify-between px-4 max-w-7xl">
        
        <div className="hidden md:flex items-center gap-2 mr-8">
          <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent tracking-tight">
            SafidoSwap
          </span>
        </div>

        <div className="flex-1 relative mx-2 min-w-0 md:flex md:justify-center">
          <div className="relative group flex items-center max-w-full">
            
            <div 
              className={`absolute left-0 top-0 bottom-0 z-20 w-12 bg-gradient-to-r from-[#0a101d] to-transparent flex items-center justify-start pointer-events-none transition-opacity duration-300 ${canScrollLeft ? 'opacity-100' : 'opacity-0'}`}
            >
              <button 
                onClick={scrollLeft}
                className="pointer-events-auto p-1 hover:text-cyan-400 text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
            </div>

            <div 
              ref={navRef}
              onScroll={checkScroll}
              className="flex items-center gap-2 overflow-x-auto scroll-smooth py-2 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              <div className="md:hidden pr-4 flex items-center">
                <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">
                  Safido
                </span>
              </div>

              <NavLink to="/" className={getNavLinkClass}>Home</NavLink>
              <NavLink to="/swap" className={getNavLinkClass}>Swap</NavLink>
              <NavLink to="/pool" className={getNavLinkClass}>Pool</NavLink>
              <NavLink to="/stake" className={getNavLinkClass}>Stake</NavLink>
              <NavLink to="/safidoprize" className={getNavLinkClass}>SafidoPrize</NavLink>
              <NavLink to="/faucet" className={getNavLinkClass}>Faucet</NavLink>
            </div>

            <div 
              className={`absolute right-0 top-0 bottom-0 z-20 w-12 bg-gradient-to-l from-[#0a101d] to-transparent flex items-center justify-end pointer-events-none transition-opacity duration-300 ${canScrollRight ? 'opacity-100' : 'opacity-0'}`}
            >
              <button 
                onClick={scrollRight}
                className="pointer-events-auto p-1 hover:text-cyan-400 text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
            
          </div>
        </div>

        <div className="flex-shrink-0 ml-4">
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
              const connected = ready && account && chain && !chain.unsupported

              if (!ready) {
                return <div aria-hidden style={{ opacity: 0, pointerEvents: 'none', userSelect: 'none' }} />
              }

              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-2 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] text-sm"
                  >
                    Connect
                  </button>
                )
              }

              return (
                <button
                  onClick={chain.unsupported ? openChainModal : openAccountModal}
                  className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700 border border-white/10 py-2 px-4 rounded-xl transition-all text-sm font-medium"
                >
                  {chain.unsupported && <span className="text-red-400">Wrong Net</span>}
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                  <span className="text-slate-200">
                    {account.displayName}
                  </span>
                </button>
              )
            }}
          </ConnectButton.Custom>
        </div>

      </div>
    </header>
  )
}