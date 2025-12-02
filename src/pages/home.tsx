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
    </section>
  )
}
