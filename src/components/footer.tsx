export default function Footer() {
  return (
    <footer className="w-full max-w-7xl mx-auto px-6 pt-16 pb-8">
      {/* Sem fundo extra, mantendo o efeito "aquário" */}
      <div className="space-y-12">
        <div className="grid md:grid-cols-4 gap-8 items-stretch text-center">
          
          {/* Column 1: Community */}
          <div className="flex flex-col h-full justify-between space-y-4">
            <div>
              <h3 className="text-2xl font-extrabold text-neutral-50 mb-3 text-outline-black">
                Community
              </h3>
              <p className="text-base font-bold text-slate-100 text-outline-black leading-relaxed">
                Join the conversation and stay updated with the latest announcements.
              </p>
            </div>
            <div className="flex justify-center">
              <a
                href="https://x.com/safidoswap"
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-2 hover:text-[var(--primary-tint)] transition-colors"
              >
                {/* Removido backdrop-blur, ajustada transparência para bg-black/10 */}
                <div className="p-3 rounded-full bg-black/10 group-hover:bg-[var(--primary)]/10 border border-white/20 group-hover:border-[var(--primary)]/50 transition-all shadow-lg hover:shadow-[var(--primary)]/30">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current text-white group-hover:text-[var(--primary-tint)]">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                  </svg>
                </div>
              </a>
            </div>
          </div>

          {/* Column 2: Documentation */}
          <div className="flex flex-col h-full justify-between space-y-4">
            <div>
              <h3 className="text-2xl font-extrabold text-neutral-50 mb-3 text-outline-black">
                Documentation
              </h3>
              <p className="text-base font-bold text-slate-100 text-outline-black leading-relaxed">
                Learn how SafidoSwap works and how to build on it.
              </p>
            </div>
            <div>
              {/* Botão super transparente sem blur */}
              <a 
                href="https://docs.safidoswap.xyz" 
                target="_blank" 
                rel="noreferrer"
                className="inline-block bg-black/10 text-neutral-50 font-bold hover:text-[var(--primary-tint)] hover:bg-black/30 hover:border-[var(--primary)]/50 px-6 py-2.5 rounded-lg border border-white/20 transition-all text-sm shadow-lg"
              >
                Read Docs
              </a>
            </div>
          </div>

          {/* Column 3: Pharos Ecosystem */}
          <div className="flex flex-col h-full justify-between space-y-4">
            <div>
              <h3 className="text-2xl font-extrabold text-neutral-50 mb-3 text-outline-black">
                Pharos Ecosystem
              </h3>
              <p className="text-base font-bold text-slate-100 text-outline-black leading-relaxed">
                Access PHRS faucets and join the Pharos community.
              </p>
            </div>
            <div>
              {/* Botão super transparente sem blur */}
              <a 
                href="https://testnet.pharosnetwork.xyz" 
                target="_blank" 
                rel="noreferrer"
                className="inline-block bg-black/10 text-neutral-50 font-bold hover:text-[var(--primary-tint)] hover:bg-black/30 hover:border-[var(--primary)]/50 px-6 py-2.5 rounded-lg border border-white/20 transition-all text-sm shadow-lg"
              >
                Pharos Portal
              </a>
            </div>
          </div>

          {/* Column 4: Support */}
          <div className="flex flex-col h-full justify-between space-y-4">
            <div>
              <h3 className="text-2xl font-extrabold text-neutral-50 mb-3 text-outline-black">
                Support & Feedback
              </h3>
              <p className="text-base font-bold text-slate-100 text-outline-black leading-relaxed">
                Found a bug or have a suggestion? We value your input.
              </p>
            </div>
            <div>
              {/* Botão super transparente sem blur */}
              <a 
                href="mailto:support@safidoswap.xyz" 
                className="inline-block bg-black/10 text-neutral-50 font-bold hover:text-[var(--primary-tint)] hover:bg-black/30 hover:border-[var(--primary)]/50 px-6 py-2.5 rounded-lg border border-white/20 transition-all text-sm shadow-lg"
              >
                Report a Bug / Contact Us
              </a>
            </div>
          </div>
        </div>
        
        {/* Copyright */}
        <div className="text-center pt-10 border-t border-white/20">
          <p className="text-sm font-bold text-slate-200 text-outline-black">
            © 2025 SafidoSwap. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}