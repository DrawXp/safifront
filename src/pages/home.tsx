import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import Swap from './swap'

const features = [
  {
    to: '/pool',
    title: 'Liquidity Pools',
    subtitle: 'Provide liquidity and benefit from our highly competitive 0.15% total trading fee. LPs automatically earn 0.10% of every swap volume proportional to their share, compounding their assets with every trade.',
  },
  {
    to: '/stake',
    title: 'Staking',
    subtitle: 'Stake your SAFI tokens to capture value from the protocol\'s emission vault. Our sustainable exponential decay model ensures long-term rewards for holders, allowing you to earn passive yield without mandatory lock-up periods.',
  },
  {
    to: '/safidoprize',
    title: 'SafidoPrize',
    subtitle: 'Participate in the verifiable on-chain lottery. The engine uses protocol revenue for automated buybacks and burns, driving deflationary pressure while offering snowball jackpots that roll over every 8 hours.',
  },
  {
    to: 'https://docs.safidoswap.xyz',
    title: 'Documentation',
    subtitle: 'Explore the comprehensive developer reference and architectural guides. Dive into the AMM mathematics, smart contract integrations, and the tokenomics models that power the SafidoSwap ecosystem.',
    external: true
  },
]

export default function Home() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="flex flex-col gap-16 py-8">
      <section className="flex flex-col lg:flex-row items-start justify-center gap-12 px-4">
        <div className="flex-1 max-w-xl text-center lg:text-left lg:pt-[7.5rem]">
          <div>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-2 text-outline">
              <span className="bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--primary-tint)] bg-clip-text text-transparent">
                SafidoSwap
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-100 font-bold text-outline-black">
              <span className="text-[var(--primary-tint)]">Trade the waves</span>
              <span className="mx-2 text-slate-300">,</span>
              <span className="text-[var(--secondary-tint)]">crave the gains</span>
            </p>
          </div>

          <div className="space-y-6 text-xl text-slate-100 leading-relaxed mt-14 font-bold">
            <p className="text-outline-black">
              Welcome to the next evolution of DeFi on the Pharos Network. 
              SafidoSwap offers seamless token swapping, automated liquidity provision, 
              and community-driven rewards in a secure, non-custodial environment.
            </p>
            <p className="text-outline-black">
              Whether you are here to swap, stake, or try your luck, 
              our ecosystem is designed to maximize capital efficiency 
              through extremely low fees and transparency.
            </p>
          </div>
        </div>

        <div className="w-full max-w-md shrink-0 relative z-10">
          <Swap />
        </div>
      </section>

      <section id="features" className="space-y-10 px-4">
        <div className="text-center space-y-4">
          <h2 className="text-4xl md:text-5xl font-extrabold text-neutral-100 drop-shadow-lg text-outline-black">
            Ecosystem Features
          </h2>
          <p className="text-xl text-slate-200 font-bold text-outline-black">
            Discover the core components of the protocol
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {features.map((card) => {
            const cardContent = (
              <>
                <div className="relative z-10 space-y-4">
                  <h3 className="text-2xl font-extrabold text-neutral-100 group-hover:text-[var(--primary-tint)] transition-colors text-outline-black">
                    {card.title}
                  </h3>
                  <p className="text-base text-slate-100 leading-relaxed font-bold opacity-90 text-outline-black">
                    {card.subtitle}
                  </p>
                </div>
                
                {/* Gradiente de hover mais sutil para combinar com a maior transparência */}
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/0 to-[var(--secondary)]/0 group-hover:from-[var(--primary)]/10 group-hover:to-[var(--secondary)]/20 transition-all duration-500" />
              </>
            )

            // Alterado: 'bg-slate-900/30 backdrop-blur-sm' para 'bg-black/10'
            const commonClasses = "group relative rounded-2xl border border-white/10 bg-black/10 overflow-hidden p-8 hover:border-[var(--primary)] hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)] transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-start min-h-[260px]"

            if (card.external) {
              return (
                <a
                  key={card.title}
                  href={card.to}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={commonClasses}
                >
                  {cardContent}
                </a>
              )
            }

            return (
              <Link
                key={card.title}
                to={card.to}
                className={commonClasses}
              >
                {cardContent}
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}