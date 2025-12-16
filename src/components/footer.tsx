export default function Footer() {
  return (
    <footer className="w-full max-w-7xl mx-auto px-4 pt-[19rem] pb-8">
      <div className="panel-card flex flex-col md:flex-row items-center justify-between gap-6 text-neutral-300">
        
        <div className="font-medium tracking-wide text-sm text-center md:text-left">
          © 2025 SafidoSwap. All rights reserved.
        </div>

        <div className="flex flex-wrap justify-center items-center gap-6">
          
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
            href="https://docs.safidoswap.xyz"
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-2 hover:text-[var(--primary)] transition-colors"
          >
            <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 border border-transparent group-hover:border-[var(--primary)]/30 transition-all">
              {/* Ícone de Livro/Documento */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M11.25 4.533A9.707 9.707 0 006 3.75c-2.352 0-4.52.722-6.326 1.973 1.978 1.032 4.008 1.688 6.326 1.688.528 0 1.04-.035 1.541-.1.455-.06.745-.515.586-.94-.13-.346-.233-.703-.306-1.071-.055-.276-.086-.56-.086-.851.016-.32.062-.64.135-.95z" />
                <path d="M12.75 4.533c.073.31.119.63.135.95.006.29-.025.575-.08.851-.073.368-.176.725-.306 1.07-.159.426.13.881.586.941.502.065 1.014.1 1.541.1 2.318 0 4.348-.656 6.326-1.688C19.02 3.472 16.852 3.75 14.5 3.75c-2.025 0-3.925.32-5.673 1.258A2.53 2.53 0 0112 4.5c.254 0 .502.011.75.033z" />
                <path fillRule="evenodd" d="M2.25 6.894A11.264 11.264 0 000 19.5C0 19.865.258 20.18.614 20.25c.062.012.126.012.188.006A11.237 11.237 0 006 18c2.274 0 4.41.65 6.22 1.777.201.126.439.168.672.115.156-.035.306-.096.444-.18A11.24 11.24 0 0018 18a11.235 11.235 0 015.204 2.253c.31.18.706.126.953-.135a.816.816 0 00.126-.402 11.263 11.263 0 00-2.25-12.822c-1.895 1.34-4.12 2.128-6.533 2.128-2.67 0-5.112-.962-7.042-2.58C6.545 4.88 4.33 4.148 2.25 6.894z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-sm font-semibold hidden sm:block">Docs</span>
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
    </footer>
  )
}