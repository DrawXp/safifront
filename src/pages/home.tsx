import { Link } from 'react-router-dom'

const cards = [
  {
    to: '/swap',
    title: 'Swap',
    subtitle: 'Trade between your favorite pairs',
    image: '/swap.webp',
    alt: 'Swap mascot',
  },
  {
    to: '/pool',
    title: 'Pool',
    subtitle: 'Create or provide liquidity to existing pools',
    image: '/pool.webp',
    alt: 'Pool mascot',
  },
  {
    to: '/stake',
    title: 'Stake',
    subtitle: 'Stake to earn yield on your SAFI token',
    image: '/stake.webp',
    alt: 'Stake mascot',
  },
  {
    to: '/safidoprize',
    title: 'SafidoPrize',
    subtitle: 'Try your luck in the Safido lottery',
    image: '/safiluck.webp',
    alt: 'SafidoPrize mascot',
  },
  {
    to: '/faucet',
    title: 'Faucet',
    subtitle: 'Claim your daily SAFI Token',
    image: '/faucet.webp',
    alt: 'Faucet mascot',
  },
]

export default function Home() {
  return (
    <section className="py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2">
          <span className="bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--primary-tint)] bg-clip-text text-transparent">
            SafidoSwap
          </span>
        </h1>
        <p className="text-sm md:text-base text-slate-200">
          <span className="text-[var(--primary-tint)] font-semibold">
            Trade the waves
          </span>
          <span className="mx-1">,</span>
          <span className="text-[var(--secondary-tint)] font-semibold">
            crave the gains
          </span>
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-8">
        {cards.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="group w-[320px] max-w-full rounded-2xl border border-black/70
                       bg-slate-900/70 overflow-hidden
                       hover:border-[var(--primary)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.7)]
                       transform hover:-translate-y-1 transition-all"
          >
            <div className="w-full">
              <img
                src={card.image}
                alt={card.alt}
                className="w-full h-auto object-cover block
                           transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </div>

            <div className="bg-[var(--primary)] text-neutral-900 text-center px-4 py-3">
              <h2 className="text-lg font-semibold">{card.title}</h2>
              <p className="text-xs sm:text-sm opacity-90">
                {card.subtitle}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <div className="panel-card mt-12 flex flex-col md:flex-row items-center justify-between gap-4 text-neutral-300">
        <div className="font-medium tracking-wide text-sm text-center md:text-left">
          © 2025 SafidoSwap. All rights reserved.
        </div>

        <div className="flex items-center gap-6">
          <a
            href="https://x.com/safidoswap"
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-2 hover:text-white transition-colors"
          >
            <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 border border-transparent group-hover:border-white/20 transition-all">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
              </svg>
            </div>
            <span className="text-sm font-semibold hidden sm:block">Get Updated</span>
          </a>

          <a
            href="mailto:safidoswap@gmail.com"
            className="group flex items-center gap-2 hover:text-white transition-colors"
          >
            <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 border border-transparent group-hover:border-white/20 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
                <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
              </svg>
            </div>
            <span className="text-sm font-semibold hidden sm:block">Contact Us</span>
          </a>
        </div>
      </div>
    </section>
  )
}